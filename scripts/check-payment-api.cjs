const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

function load(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  }, { filename: file });
  return exports;
}

async function main() {
  const calls = [];
  const parsedOrder = { id: 15 };
  const parsedOrders = [{ id: 15 }];

  const apiClient = {
    post: async (url, body, config) => {
      calls.push({ method: "post", url, body, config });
      return { data: url.endsWith("/cancel") ? undefined : { raw: "order" } };
    },
    get: async (url, config) => {
      calls.push({ method: "get", url, config });
      return { data: url === "/payments" ? [{ raw: "history" }] : { raw: "order" } };
    },
  };

  const service = load("src/modules/payments/services/paymentService.ts", {
    "../../../services/axiosService": { apiClient },
    "../utils/paymentParsing": {
      parsePaymentOrder: () => parsedOrder,
      parsePaymentOrders: () => parsedOrders,
    },
  });

  assert.equal(await service.createSubscriptionPayment(2, "uuid-sub"), parsedOrder);
  assert.equal(await service.createSmsPackagePayment(1, "uuid-sms"), parsedOrder);
  assert.equal(await service.syncPayment(15), parsedOrder);
  assert.deepEqual(await service.getPayments(), parsedOrders);
  assert.equal(await service.getPayment(15), parsedOrder);
  assert.equal(await service.cancelPayment(15), undefined);

  const subscription = calls.find((call) => call.url === "/payments/subscriptions/2");
  assert.equal(subscription.method, "post");
  assert.equal(subscription.body, undefined);
  assert.equal(subscription.config.headers["Idempotency-Key"], "uuid-sub");

  const sms = calls.find((call) => call.url === "/payments/sms-packages/1");
  assert.equal(sms.method, "post");
  assert.equal(sms.body, undefined);
  assert.equal(sms.config.headers["Idempotency-Key"], "uuid-sms");

  assert.ok(calls.some((call) => call.method === "post" && call.url === "/payments/15/sync"));
  const history = calls.find((call) => call.method === "get" && call.url === "/payments");
  assert.equal(history.config.params.limit, 30);
  assert.ok(calls.some((call) => call.method === "get" && call.url === "/payments/15"));
  const cancel = calls.find((call) => call.method === "post" && call.url === "/payments/15/cancel");
  assert.equal(cancel.body, undefined);

  const source = fs.readFileSync("src/modules/payments/services/paymentService.ts", "utf8");
  assert.doesNotMatch(source, /\/api\/payments/);
  console.log("Payment API contract passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
