const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
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
    },
    { filename: file },
  );
  return exports;
}

async function main() {
  const calls = [];
  const parsed = { planCode: "STANDARD", cancellationRequestedAt: "now" };
  const service = load("src/modules/subscription/services/subscriptionService.ts", {
    "../../../services/axiosService": {
      apiClient: {
        post: async (url, body) => {
          calls.push({ url, body });
          return { data: { subscription: true } };
        },
        get: async () => ({ data: [] }),
      },
    },
    "../utils/subscriptionParsing": {
      parseCurrentSubscription: () => parsed,
      parseSubscriptionPlans: () => [],
      parseSmsPackages: () => [],
    },
  });

  assert.equal(
    await service.cancelCurrentSubscription(),
    parsed,
    "Cancel endpoint must return the parsed current subscription",
  );
  assert.deepEqual(calls, [
    { url: "/subscriptions/current/cancel", body: undefined },
  ]);

  console.log("Subscription cancellation API contract passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
