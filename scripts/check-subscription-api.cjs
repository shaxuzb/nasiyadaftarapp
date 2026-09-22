// The backend removed POST /api/subscriptions/current/cancel; it now answers
// 404. Switching plans is a single step: buy the new plan directly.
//
// Two call sites used to hit that endpoint. The visible one was the
// cancellation bottom sheet. The other was inside the payment lifecycle, which
// cancelled the previous plan after a subscription order came back paid but
// unfulfilled — and threw if the call failed, which would now turn a
// successful payment into a failed sync. This check keeps both gone.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function load(file, dependencies = {}) {
  const code = ts.transpileModule(read(file), {
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
  const servicePath = "src/modules/subscription/services/subscriptionService.ts";
  const lifecyclePath = "src/modules/payments/services/paymentLifecycleCore.ts";
  const sheetPath = "src/bottom-sheet/sheets/SubscriptionCancellationSheet.tsx";

  // 1. The removed endpoint must not be referenced anywhere in the app.
  const sources = [
    "src/modules/subscription",
    "src/modules/payments",
    "src/bottom-sheet",
    "src/screens",
  ];
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const source = read(path);
      if (
        source.includes("subscriptions/current/cancel") ||
        source.includes("cancelCurrentSubscription")
      ) {
        offenders.push(path);
      }
    }
  };
  for (const dir of sources) walk(dir);
  assert.deepEqual(
    offenders,
    [],
    "The removed cancel endpoint must not be referenced (returns 404)",
  );

  assert.equal(
    fs.existsSync(sheetPath),
    false,
    "The subscription cancellation sheet must not come back",
  );

  // 2. The payment lifecycle must sync an order without a cancellation step.
  const lifecycle = read(lifecyclePath);
  assert.doesNotMatch(
    lifecycle,
    /subscriptionCancellationAttempts/,
    "The payment lifecycle must not track subscription cancellation attempts",
  );
  assert.doesNotMatch(
    lifecycle,
    /onSubscriptionCancellation/,
    "The payment lifecycle must not expose a subscription cancellation hook",
  );

  // 3. Reading the current subscription must still work unchanged.
  const calls = [];
  const parsed = { planCode: "STANDARD" };
  const service = load(servicePath, {
    "../../../services/axiosService": {
      apiClient: {
        post: async (url, body) => {
          calls.push({ method: "post", url, body });
          return { data: {} };
        },
        get: async (url) => {
          calls.push({ method: "get", url });
          return { data: {} };
        },
      },
    },
    "../utils/subscriptionParsing": {
      parseCurrentSubscription: () => parsed,
      parseSubscriptionPlans: () => [],
      parseSmsPackages: () => [],
    },
  });

  assert.equal(
    service.cancelCurrentSubscription,
    undefined,
    "cancelCurrentSubscription must no longer be exported",
  );
  assert.equal(await service.getCurrentSubscription(), parsed);
  assert.deepEqual(calls, [{ method: "get", url: "/subscriptions/current" }]);

  console.log("Subscription plan-change API contract passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
