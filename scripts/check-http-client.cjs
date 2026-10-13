// The HTTP client, run against a fake server.
//
// 1. Every request says which app is calling (X-App-Version, X-Platform,
//    X-App-Build, X-Device-Id).
// 2. An expired token is refreshed exactly once, however many requests notice.
//    The backend rejects a second refresh made with the same refresh token, so
//    two of them at once means a spurious 401 and, at worst, a sign-out.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

function load(file, dependencies) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    code,
    {
      exports,
      require: (name) => {
        if (name in dependencies) return dependencies[name];
        throw new Error(`Unexpected dependency: ${name}`);
      },
      URL,
    },
    { filename: file },
  );
  return exports;
}

const accountRoute = load("src/services/accountRoute.ts", {});
const appHeaders = load("src/services/appHeaders.ts", {});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const settle = async () => {
  for (let tick = 0; tick < 10; tick++) await new Promise((resolve) => setImmediate(resolve));
};

function createClient() {
  const env = {
    session: { token: "old-token", refreshToken: "refresh-1", uniqueId: "device-1", user: {} },
    refreshCalls: [],
    refreshResults: [],
    sent: [],
    signedOut: 0,
  };
  let requestInterceptor;
  let responseError;

  const client = (config) => {
    // What the real client does with a config: run it through the request
    // interceptor, then send it.
    return Promise.resolve(requestInterceptor(config)).then((final) => {
      env.sent.push({ url: final.url, authorization: final.headers.Authorization });
      return { data: "ok", config: final };
    });
  };
  client.interceptors = {
    request: { use: (handler) => (requestInterceptor = handler) },
    response: { use: (_ok, onError) => (responseError = onError) },
  };

  const axios = {
    create: () => client,
    isAxiosError: (error) => Boolean(error && error.isAxiosError),
    post: (url, body) => {
      env.refreshCalls.push({ url, refreshToken: body.refreshToken });
      const pending = deferred();
      env.refreshResults.push(pending);
      return pending.promise;
    },
  };

  const service = load("src/services/axiosService.ts", {
    axios: { __esModule: true, default: axios },
    "../config/appInfo": { APP_VERSION: "1.1.5", APP_BUILD: "19", APP_PLATFORM: "android" },
    "../config/env": { API_BASE_URL: "https://api.example/api" },
    "../core/network/networkState": {
      assertOnlineForMutation() {},
      isServerMutationMethod: () => false,
    },
    "../modules/auth/types": {},
    "./accountRoute": accountRoute,
    "./appHeaders": appHeaders,
    "./authStorage": {
      getAuthSessionSync: () => env.session,
      hydrateAuthSession: async () => env.session,
      setAuthSession: async (next) => {
        env.session = next;
      },
      clearAuthSession: async () => {
        env.session = null;
      },
    },
  });
  service.setUnauthorizedHandler(() => env.signedOut++);

  // A request that was sent with \`token\` and came back 401.
  const unauthorized = (url, token) =>
    responseError({
      isAxiosError: true,
      response: { status: 401 },
      config: { url, method: "get", headers: { Authorization: `Bearer ${token}` } },
    });

  return { env, requestInterceptor: (config) => requestInterceptor(config), unauthorized };
}

async function main() {
  /* 1. Every request names the app; a signed-in one names the device too. */

  const plain = createClient();
  const signedIn = await plain.requestInterceptor({ url: "/clients", method: "get", headers: {} });
  assert.deepEqual(
    { ...signedIn.headers },
    {
      Authorization: "Bearer old-token",
      "X-App-Version": "1.1.5",
      "X-Platform": "android",
      "X-App-Build": "19",
      "X-Device-Id": "device-1",
    },
  );
  plain.env.session = null;
  const signedOut = await plain.requestInterceptor({ url: "/account/phone/request", method: "post", headers: {} });
  assert.deepEqual(
    { ...signedOut.headers },
    { "X-App-Version": "1.1.5", "X-Platform": "android", "X-App-Build": "19" },
    "Without a session there is no token and no device id, but still a version",
  );

  /* 2. Several requests notice the expiry at once: one refresh, all retried. */

  const burst = createClient();
  const first = burst.unauthorized("/clients", "old-token");
  const second = burst.unauthorized("/reports", "old-token");
  const third = burst.unauthorized("/payments", "old-token");
  await settle();
  assert.equal(burst.env.refreshCalls.length, 1, "Three 401s must cost one refresh");
  burst.env.refreshResults[0].resolve({ data: { accessToken: "new-token", refreshToken: "refresh-2" } });
  await Promise.all([first, second, third]);
  assert.deepEqual(
    burst.env.sent.map((item) => item.authorization),
    ["Bearer new-token", "Bearer new-token", "Bearer new-token"],
    "Each is retried with the new token",
  );
  assert.equal(burst.env.session.refreshToken, "refresh-2");

  /* 3. A request made while the refresh is under way waits for the new token. */

  const waiting = createClient();
  const trigger = waiting.unauthorized("/clients", "old-token");
  await settle();
  let left = false;
  const late = waiting.requestInterceptor({ url: "/reports", method: "get", headers: {} }).then((config) => {
    left = true;
    return config;
  });
  await settle();
  assert.equal(left, false, "It must not leave with the token that is being replaced");
  waiting.env.refreshResults[0].resolve({ data: { accessToken: "new-token" } });
  assert.equal((await late).headers.Authorization, "Bearer new-token");
  await trigger;

  // The refresh endpoint's own neighbours are not held up by it.
  const publicRoute = createClient();
  void publicRoute.unauthorized("/clients", "old-token");
  await settle();
  const loginRequest = await publicRoute.requestInterceptor({
    url: "/account/phone/request",
    method: "post",
    headers: {},
  });
  assert.ok(loginRequest, "A public account route does not wait for a refresh");
  publicRoute.env.refreshResults[0].resolve({ data: { accessToken: "new-token" } });
  await settle();

  /* 4. A 401 that arrives after the refresh finished does not start another. */

  const stale = createClient();
  const trigger2 = stale.unauthorized("/clients", "old-token");
  await settle();
  stale.env.refreshResults[0].resolve({ data: { accessToken: "new-token", refreshToken: "refresh-2" } });
  await trigger2;
  // This one left before the refresh and is only now coming back.
  await stale.unauthorized("/reports", "old-token");
  assert.equal(
    stale.env.refreshCalls.length,
    1,
    "Its token was already replaced: retry with the current one, do not refresh again",
  );
  assert.equal(stale.env.sent.at(-1).authorization, "Bearer new-token");

  /* 5. A token the server really rejects still refreshes, and a refused
        refresh still signs out. */

  const expiredAgain = createClient();
  const attempt = expiredAgain.unauthorized("/clients", "old-token");
  await settle();
  assert.equal(expiredAgain.env.refreshCalls.length, 1);
  expiredAgain.env.refreshResults[0].reject({ isAxiosError: true, response: { status: 401 } });
  await assert.rejects(attempt);
  assert.equal(expiredAgain.env.session, null, "A refused refresh clears the session");
  assert.equal(expiredAgain.env.signedOut, 1);

  const offline = createClient();
  const attempt2 = offline.unauthorized("/clients", "old-token");
  await settle();
  offline.env.refreshResults[0].reject(new Error("Network Error"));
  await assert.rejects(attempt2);
  assert.ok(offline.env.session, "A network failure during refresh must not sign the user out");

  /* 6. The version check, which does not go through the client, names the app too. */

  const versionCheck = fs.readFileSync(
    path.join(root, "src/modules/app-update/services/appUpdateService.ts"),
    "utf8",
  );
  assert.match(versionCheck, /"X-App-Version": currentVersion,\s*"X-Platform": platform,/);

  console.log("HTTP client: app headers on every request, one refresh per expiry");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
