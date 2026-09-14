const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
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
      setTimeout,
      clearTimeout,
      AbortController,
      ...globals,
    },
    { filename: file },
  );
  return exports;
}

async function main() {
  const calls = [];
  const parsed = { platform: "android", latestVersion: "1.0.11" };
  let parserArgs;

  const service = load(
    "src/modules/app-update/services/appUpdateService.ts",
    {
      "../../../config/env": { API_BASE_URL: "https://api.example.com/api" },
      "../constants/appUpdate.constants": {
        APP_UPDATE_REQUEST_TIMEOUT_MS: 8000,
      },
      "../utils/appVersionResponse": {
        parseAppVersionCheckResponse: (value, platform) => {
          parserArgs = { value, platform };
          return parsed;
        },
      },
    },
    {
      fetch: async (url, options) => {
        calls.push({ url, options });
        return {
          ok: true,
          status: 200,
          json: async () => ({ backend: true }),
        };
      },
    },
  );

  assert.equal(typeof service.fetchAppVersionCheck, "function");
  const result = await service.fetchAppVersionCheck("android", "1.0.10");

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://api.example.com/api/app-versions/check?platform=android&currentVersion=1.0.10",
  );
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.Accept, "application/json");
  assert.ok(calls[0].options.signal, "request must use an abort signal");
  assert.deepEqual(parserArgs, {
    value: { backend: true },
    platform: "android",
  });
  assert.equal(result, parsed);

  const source = fs.readFileSync(
    "src/modules/app-update/services/appUpdateService.ts",
    "utf8",
  );
  assert.doesNotMatch(source, /raw\.githubusercontent\.com/);
  assert.doesNotMatch(source, /APP_VERSION_CONFIG_URL/);

  console.log("Backend app version service contract passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
