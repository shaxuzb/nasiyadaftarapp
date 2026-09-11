const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");

function loadTypeScript(filename, injected = {}) {
  const source = fs.readFileSync(filename, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, ...injected });
  return exports;
}

const parser = loadTypeScript(
  "src/modules/subscription/utils/subscriptionParsing.ts",
);
const subscription = parser.parseCurrentSubscription({
  subscriptionId: 13,
  planId: 1,
  planCode: "FREE",
  planName: "Bepul",
  price: 0,
  startAt: "2026-08-20T13:08:46.933998",
  endAt: null,
  source: "system",
  provider: null,
  maxOrganizations: 1,
  maxClients: null,
  unlimitedOrganizations: false,
  unlimitedClients: true,
  telegramBotEnabled: false,
  blacklistEnabled: false,
  sms: {
    periodMonth: "2026-09-01",
    monthlyLimit: 3,
    monthlyUsed: 0,
    monthlyRemaining: 3,
    purchasedRemaining: 0,
    totalRemaining: 3,
  },
});
assert.equal(subscription.subscriptionId, 13);
assert.equal(subscription.maxOrganizations, 1);
assert.equal(subscription.maxClients, null);
assert.equal(subscription.unlimitedClients, true);
assert.equal(subscription.sms.periodMonth, "2026-09-01");
assert.equal(subscription.sms.totalRemaining, 3);

const pro = parser.parseCurrentSubscription({
  planCode: "PRO",
  planName: "Pro",
  maxOrganizations: null,
  maxClients: null,
  unlimitedOrganizations: false,
  unlimitedClients: false,
  telegramBotEnabled: true,
  blacklistEnabled: true,
  sms: {
    monthlyLimit: 100,
    monthlyRemaining: 0,
    purchasedRemaining: 12,
    totalRemaining: 12,
  },
});
assert.equal(pro.unlimitedOrganizations, true);
assert.equal(pro.unlimitedClients, true);
assert.equal(pro.sms.totalRemaining, 12);

const plans = parser.parseSubscriptionPlans([
  {
    id: 1,
    code: "FREE",
    name: "Bepul",
    description: "start",
    price: 0,
    durationDays: null,
    maxOrganizations: 1,
    maxClients: null,
    monthlySmsLimit: 3,
    telegramBotEnabled: false,
    blacklistEnabled: false,
    stateId: 1,
    createdDate: "x",
    updatedDate: null,
  },
  {
    id: 2,
    code: "PRO",
    name: "Pro",
    description: "paid",
    price: 0,
    durationDays: 30,
    maxOrganizations: null,
    maxClients: null,
    monthlySmsLimit: 100,
    telegramBotEnabled: true,
    blacklistEnabled: true,
    stateId: 1,
    createdDate: "x",
    updatedDate: null,
  },
]);
assert.equal(plans.length, 2);
assert.equal(plans[0].durationDays, null);
assert.equal(plans[1].maxOrganizations, null);

const packages = parser.parseSmsPackages([
  {
    id: 4,
    code: "SMS_100",
    name: "100 SMS",
    smsCount: 100,
    price: 0,
    stateId: 1,
    createdDate: "x",
    updatedDate: null,
  },
]);
assert.equal(packages[0].smsCount, 100);

const serviceSource = fs.readFileSync(
  "src/modules/subscription/services/subscriptionService.ts",
  "utf8",
);
assert.match(serviceSource, /get\("\/subscriptions\/current"/);
assert.match(serviceSource, /get\("\/subscriptions\/plans"/);
assert.match(serviceSource, /get\("\/subscriptions\/sms-packages"/);
console.log("Subscription current, plans, SMS package contract passed");
