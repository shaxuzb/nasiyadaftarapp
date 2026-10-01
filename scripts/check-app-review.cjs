// The store rating dialog: asked for at a good moment, rarely, and never in
// the way.
//
// Runs the real service against fake storage, a fake store API and a clock the
// test controls, so the timing rules are exercised rather than read.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const DAY = 24 * 60 * 60 * 1000;

function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
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
      ...globals,
    },
    { filename: file },
  );
  return exports;
}

const policy = load("src/modules/app-review/utils/reviewPolicy.ts", {});

function createHarness({ stored = null, requestFails = false, platform = "ios" } = {}) {
  const env = {
    now: Date.UTC(2026, 0, 1),
    appState: "active",
    keyboardVisible: false,
    available: true,
    storage: stored,
    reads: 0,
    writes: 0,
    requests: 0,
    timers: [],
  };
  const service = load(
    "src/modules/app-review/services/reviewPrompt.ts",
    {
      "@react-native-async-storage/async-storage": {
        default: {
          getItem: async () => {
            env.reads++;
            return env.storage;
          },
          setItem: async (_key, value) => {
            env.writes++;
            env.storage = value;
          },
        },
      },
      "react-native": {
        AppState: {
          get currentState() {
            return env.appState;
          },
        },
        Keyboard: { isVisible: () => env.keyboardVisible },
        Platform: { OS: platform },
      },
      "expo-store-review": {
        isAvailableAsync: async () => env.available,
        hasAction: async () => true,
        requestReview: async () => {
          if (requestFails) throw new Error("store unavailable");
          env.requests++;
        },
      },
      "../utils/reviewPolicy": policy,
    },
    {
      // A release build: the development trace must not be needed to work.
      __DEV__: false,
      Date: { now: () => env.now },
      setTimeout: (callback, delay) => env.timers.push({ callback, delay }),
    },
  );

  // Saves one transaction and lets the delayed check run to completion.
  async function save() {
    service.noteSuccessfulTransaction();
    const timer = env.timers.shift();
    timer.callback();
    for (let tick = 0; tick < 20; tick++) await Promise.resolve();
    await new Promise((resolve) => setImmediate(resolve));
    return timer;
  }
  async function saveTimes(count) {
    for (let index = 0; index < count; index++) await save();
  }
  return { env, save, saveTimes, state: () => policy.parseReviewPromptState(env.storage) };
}

async function main() {
  /* 1. Nothing happens on the save itself. */

  const fresh = createHarness();
  const timer = await fresh.save();
  assert.ok(
    timer.delay >= 1000,
    "The check must wait until the sheet has closed and the toast was seen",
  );
  assert.equal(fresh.state().successCount, 1);
  assert.equal(fresh.env.requests, 0, "A first transaction must not ask for a rating");

  /* 2. Fewer saved transactions than the minimum does not ask. */

  await fresh.saveTimes(policy.MIN_SUCCESSES_BEFORE_FIRST_REQUEST - 2);
  assert.equal(fresh.env.requests, 0, "The user must have used the app before being asked");
  assert.equal(fresh.env.reads, 1, "Storage is read once per run, then kept in memory");

  /* 3. Reaching the minimum, after the waiting days if any, asks once. */

  fresh.env.now += policy.MIN_DAYS_BEFORE_FIRST_REQUEST * DAY;
  await fresh.save();
  assert.equal(
    fresh.state().successCount,
    policy.MIN_SUCCESSES_BEFORE_FIRST_REQUEST,
  );
  assert.equal(fresh.env.requests, 1, "The transaction that reaches the minimum asks");
  await fresh.saveTimes(30);
  fresh.env.now += 30 * DAY;
  await fresh.saveTimes(30);
  assert.equal(fresh.env.requests, 1, "The dialog must not come back inside the cooldown");

  fresh.env.now += policy.DAYS_BETWEEN_REQUESTS * DAY;
  await fresh.save();
  assert.equal(fresh.env.requests, 2, "After the cooldown, continued use may ask again");

  /* 3b. Android, with no yearly cap, comes back sooner than iOS. */

  const askedAt = Date.UTC(2026, 0, 1);
  const askedOnce = JSON.stringify({
    successCount: 20,
    firstSuccessAt: Date.UTC(2025, 0, 1),
    lastRequestedAt: askedAt,
    successCountAtLastRequest: 20,
  });
  for (const platform of ["android", "ios"]) {
    const returning = createHarness({ stored: askedOnce, platform });
    returning.env.now = askedAt + policy.ANDROID_DAYS_BETWEEN_REQUESTS * DAY;
    await returning.saveTimes(policy.MIN_SUCCESSES_BETWEEN_REQUESTS);
    assert.equal(
      returning.env.requests,
      platform === "android" ? 1 : 0,
      `${platform}: ${policy.ANDROID_DAYS_BETWEEN_REQUESTS} days after the last request`,
    );
  }

  /* 4. A busy user is not interrupted, and the chance is kept. */

  const ready = JSON.stringify({
    successCount: 10,
    firstSuccessAt: Date.UTC(2025, 0, 1),
    lastRequestedAt: null,
    successCountAtLastRequest: 0,
  });

  const typing = createHarness({ stored: ready });
  typing.env.keyboardVisible = true;
  await typing.save();
  assert.equal(typing.env.requests, 0, "No dialog while the user is typing the next entry");
  assert.equal(typing.state().lastRequestedAt, null, "A skipped moment must not start the cooldown");
  typing.env.keyboardVisible = false;
  await typing.save();
  assert.equal(typing.env.requests, 1, "The next quiet moment asks");

  const background = createHarness({ stored: ready });
  background.env.appState = "background";
  await background.save();
  assert.equal(background.env.requests, 0, "No dialog once the app has left the foreground");

  /* 5. Where the store dialog cannot show, nothing is recorded as asked. */

  const unavailable = createHarness({ stored: ready });
  unavailable.env.available = false;
  await unavailable.save();
  assert.equal(unavailable.env.requests, 0);
  assert.equal(unavailable.state().lastRequestedAt, null);

  /* 6. A store failure stays inside the service and is retried later. */

  const failing = createHarness({ stored: ready, requestFails: true });
  await failing.save();
  assert.equal(failing.state().lastRequestedAt, null, "A failed request must not cost the cooldown");
  assert.equal(failing.state().successCount, 11, "The transaction is still counted");

  /* 7. It is wired to a saved transaction and to nothing else. */

  const callers = [];
  (function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !full.includes("app-review")) {
        if (fs.readFileSync(full, "utf8").includes("noteSuccessfulTransaction(")) {
          callers.push(path.relative(root, full).replace(/\\/g, "/"));
        }
      }
    }
  })(path.join(root, "src"));
  assert.deepEqual(
    callers,
    ["src/bottom-sheet/sheets/TransactionSheet.tsx"],
    "The rating prompt belongs to one happy moment, not to app start or navigation",
  );

  console.log("Store rating prompt: timing, cooldown, busy-user and failure checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
