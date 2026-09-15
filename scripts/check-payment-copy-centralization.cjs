const assert = require("node:assert/strict");
const fs = require("node:fs");

const files = [
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
  "src/bottom-sheet/sheets/PaymentStatusSheet.tsx",
  "src/bottom-sheet/sheets/PaymentDetailSheet.tsx",
  "src/screens/PaymentHistoryScreen.tsx",
  "src/modules/payments/components/PaymentOrderContent.tsx",
];

const copy = fs.readFileSync(
  "src/modules/payments/i18n/paymentCopy.ts",
  "utf8",
);

assert.match(copy, /export const PAYMENT_COPY/);
assert.match(copy, /getPaymentCopy/);
assert.match(copy, /pending/);
assert.match(copy, /fulfilled/);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  assert.match(source, /getPaymentCopy/);
  assert.doesNotMatch(source, /const COPY\s*=/);
}

console.log("Payment copy centralization contract passed");
