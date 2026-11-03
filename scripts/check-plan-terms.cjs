// Premium is sold for 1, 3 or 6 months, and renewed the same way.
//
//   GET  /subscriptions/plans                     each plan has "periods"
//   POST /payments/subscriptions/{id}?provider=&months=
//   POST /payments/subscriptions/renew?provider=&months=
//   GET  /subscriptions/current                   canRenew
//
// Without "months" the server sells one month, so an app that does not send
// it keeps working; this one sends the term the user chose.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const read = (file) => fs.readFileSync(file, "utf8");

function load(file, dependencies = {}) {
  const code = ts.transpileModule(read(file), {
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
    },
    { filename: file },
  );
  return exports;
}

async function main() {
  /* The requests carry the term, and the renewal its provider. */

  const calls = [];
  const apiClient = {
    post: async (url, body, config) => {
      calls.push({ url, body, config });
      return { data: { raw: "order" } };
    },
    get: async () => ({ data: [] }),
  };
  const service = load("src/modules/payments/services/paymentService.ts", {
    "../../../services/axiosService": { apiClient },
    "../utils/paymentParsing": { parsePaymentOrder: () => ({ id: 1 }), parsePaymentOrders: () => [] },
    "../utils/paymentProviders": { parsePaymentProviders: () => [] },
  });
  const key = "6b1f4a2e-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

  await service.createSubscriptionPayment(4, key, "payme", 3);
  await service.createSubscriptionPayment(4, key);
  await service.createSubscriptionRenewalPayment(key, "click", 6);
  await service.createSubscriptionRenewalPayment(key);

  assert.equal(calls[0].url, "/payments/subscriptions/4");
  assert.deepEqual({ ...calls[0].config.params }, { provider: "payme", months: 3 });
  assert.equal(calls[0].config.headers["Idempotency-Key"], key);
  assert.equal("params" in calls[1].config, false, "No choice: the request is what it always was");
  assert.equal(calls[2].url, "/payments/subscriptions/renew");
  assert.deepEqual({ ...calls[2].config.params }, { provider: "click", months: 6 });
  assert.equal(calls[2].body, undefined, "A renewal has no body: the server renews the current plan");
  assert.equal("params" in calls[3].config, false, "The renewal no longer forces Payme");
  await assert.rejects(service.createSubscriptionRenewalPayment("not-a-uuid", "payme", 1), /idempotency key/);

  /* The model. */

  const parsing = read("src/modules/subscription/utils/subscriptionParsing.ts");
  assert.match(parsing, /periods: parsePlanPeriods\(value\.periods, \{ price, oldPrice, discountPercent \}\),/);
  assert.match(parsing, /canRenew: bool\(value\.canRenew\),/);
  assert.doesNotMatch(
    parsing,
    /^import (?!type )[^;]*from "\.\/planPeriods"/m,
    "Only a type import: standalone tests load this file directly",
  );
  assert.match(read("src/modules/payments/utils/paymentParsing.ts"), /periodMonths: nullablePositiveInteger\(value\.periodMonths\),/);

  /* Each term, and a renewal, is a request of its own: its own idempotency key. */

  const core = read("src/modules/payments/services/paymentLifecycleCore.ts");
  assert.match(core, /\[renew \? "renew" : null, months !== null \? `m\$\{months\}` : null\]/);
  const storage = read("src/modules/payments/services/paymentStorageCore.ts");
  assert.match(storage, /existing\.provider === wantedProvider &&\s*existing\.variant === wantedVariant/);

  /* Choosing another term for the same plan replaces its unpaid order. */

  const hook = read("src/modules/payments/hooks/usePaymentCheckout.ts");
  assert.match(hook, /pendingPayments\.filter\(\(payment\) => !samePlan\(payment\)\)/);
  assert.match(hook, /stale\.map\(\(payment\) => clearPendingPayment\(user\.id, payment\.orderId\)\)/);

  /* The payment sheet: the term, changeable, and the renewal note. */

  const sheet = read("src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx");
  assert.match(sheet, /getPlanPeriod\(periods, props\.months\)\?\.months/, "Starts on the term tapped on the card");
  assert.match(sheet, /\?\?\s*DEFAULT_PERIOD_MONTHS/, "…otherwise one month");
  assert.match(sheet, /<PlanPeriodPicker\s+periods=\{periods\}\s+value=\{period\?\.months \?\? null\}\s+onChange=\{setMonths\}/);
  assert.match(sheet, /\{renew \? \(\s*<Text style=\{styles\.renewHint\}>\{t\("subscription\.renewHint"\)\}<\/Text>/);
  assert.match(read("src/bottom-sheet/types.ts"), /months\?: number;[\s\S]{0,120}renew\?: boolean;/);

  /* The plans screen. */

  const screen = read("src/screens/SubscriptionScreen.tsx");
  assert.match(
    screen,
    /\{selectable && plan\.periods\.length > 1 \? \(\s*<PlanPeriodPicker\s+periods=\{plan\.periods\}\s+value=\{null\}\s+onChange=\{\(months\) => openPlanPayment\(plan, months\)\}/,
    "The terms on the card; a tap goes on to payment with that term",
  );
  assert.match(screen, /\{isCurrent && current\?\.canRenew \? \(/, "Renewal only when the server allows it");
  assert.match(screen, /onPress=\{\(\) => openRenewal\(plan\)\}/);
  assert.match(screen, /openSheet\("paymentCheckout", \{ productType: "subscription", plan, renew: true \}\)/);
  assert.doesNotMatch(
    screen,
    /createSubscriptionRenewalPayment|Linking\.openURL|isRenewing/,
    "The screen no longer renews behind the payment sheet's back",
  );
  assert.match(screen, /!legacyCurrent\.canRenew && premiumPlan \? \(/, "An old Standard plan leads to Premium");
  assert.match(screen, /onPress=\{\(\) => openPlanPayment\(premiumPlan\)\}/);

  /* The picker. */

  const picker = read("src/modules/subscription/components/PlanPeriodPicker.tsx");
  assert.match(picker, /accessibilityRole="radiogroup"/);
  assert.match(picker, /accessibilityState=\{\{ selected, disabled \}\}/);
  assert.match(picker, /t\("subscription\.perMonthApprox", \{/, "What a longer term costs per month");
  assert.match(picker, /<OldPrice value=\{discount\.oldPrice\} \/>/);

  /* Wording in both languages. */

  for (const file of ["src/i18n/translations/uz.ts", "src/i18n/translations/ru.ts"]) {
    const source = read(file);
    for (const keyName of ["periodTitle", "periodMonths", "perMonthApprox", "renewHint", "upgradeToPremium", "legacyPlanHint"]) {
      assert.match(source, new RegExp("\\n    " + keyName + ":"), `${file}: subscription.${keyName}`);
    }
  }

  console.log("Plan terms: 1/3/6 months on the card and in payment, renewal and the way from Standard passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
