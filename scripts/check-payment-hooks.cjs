const assert = require("node:assert/strict");
const fs = require("node:fs");

const checkout = fs.readFileSync(
  "src/modules/payments/hooks/usePaymentCheckout.ts",
  "utf8",
);
const lifecycle = fs.readFileSync(
  "src/modules/payments/hooks/usePaymentOrderLifecycle.ts",
  "utf8",
);
const queries = fs.readFileSync(
  "src/modules/payments/hooks/usePaymentQueries.ts",
  "utf8",
);

assert.match(checkout, /getOrCreateCheckoutAttempt|createPaymentLifecycleCore/);
assert.match(checkout, /refreshSubscription/);
assert.match(checkout, /paymentsRoot|paymentsHistory/);
assert.doesNotMatch(checkout, /setInterval|setTimeout\([^,]+,\s*\d+\s*\)/);

assert.match(lifecycle, /AppState\.addEventListener/);
assert.match(lifecycle, /Linking\.openURL/);
assert.match(lifecycle, /getPendingPayment/);
assert.match(lifecycle, /openedExternally/);
assert.match(lifecycle, /syncOnForeground/);
assert.match(lifecycle, /createPaymentLifecycleCore/);
assert.doesNotMatch(lifecycle, /setInterval/);

assert.match(queries, /queryKeys\.paymentsHistory/);
assert.match(queries, /queryKeys\.payment/);
assert.match(queries, /getPayments/);
assert.match(queries, /getPayment/);

console.log("Payment hook lifecycle contract passed");
