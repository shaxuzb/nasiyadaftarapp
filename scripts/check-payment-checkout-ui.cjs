const assert = require("node:assert/strict");
const fs = require("node:fs");

const checkout = fs.readFileSync(
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
  "utf8",
);

assert.match(checkout, /usePaymentCheckout/);
assert.match(checkout, /isCreating/);
assert.match(checkout, /busy:\s*isCreating/);
assert.match(checkout, /copy\.processing/);
assert.match(checkout, /startCheckout\(/);
assert.match(checkout, /closeSheet\(\(\) =>/);
assert.match(checkout, /openSheet\("paymentStatus"/);
assert.match(checkout, /openCheckoutOnMount/);
assert.match(checkout, /PendingPaymentCheckoutError/);
assert.match(checkout, /pendingPayment/);

console.log("Payment checkout loading and transition contract passed");
