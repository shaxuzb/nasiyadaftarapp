const assert = require("node:assert/strict");
const fs = require("node:fs");

const status = fs.readFileSync(
  "src/bottom-sheet/sheets/PaymentStatusSheet.tsx",
  "utf8",
);
const detail = fs.readFileSync(
  "src/bottom-sheet/sheets/PaymentDetailSheet.tsx",
  "utf8",
);
const summary = fs.readFileSync(
  "src/modules/payments/components/PaymentOrderContent.tsx",
  "utf8",
);

assert.match(status, /usePaymentOrderLifecycle/);
assert.match(status, /syncOnForeground:\s*true/);
assert.match(status, /openCheckoutOnMount/);
assert.match(status, /useConfirmDialog/);
assert.match(status, /order\.status === "pending"/);
assert.match(status, /order\.status === "paid"/);
assert.match(status, /order\.isFulfilled/);
assert.match(status, /cancel\(\)/);
assert.match(status, /sync\(\)/);
assert.match(status, /openCheckout\(\)/);

assert.match(detail, /usePaymentOrderLifecycle/);
assert.match(detail, /syncOnForeground:\s*false/);
assert.match(detail, /useConfirmDialog/);
assert.match(detail, /orderId/);

assert.match(summary, /productName/);
assert.match(summary, /amount/);
assert.match(summary, /status/);
assert.match(summary, /provider/);
assert.match(summary, /accountNumber/);

console.log("Payment status/detail UI contract passed");
