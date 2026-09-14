const assert = require("node:assert/strict");
const fs = require("node:fs");

const types = fs.readFileSync("src/bottom-sheet/types.ts", "utf8");
const registry = fs.readFileSync("src/bottom-sheet/registry.ts", "utf8");
const checkout = fs.readFileSync(
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
  "utf8",
);

for (const name of ["paymentCheckout", "paymentStatus", "paymentDetail"]) {
  assert.match(types, new RegExp(`\\|?\\s*\\"${name}\\"`));
  assert.match(registry, new RegExp(`${name}:`));
}

assert.match(types, /productType:\s*"subscription"/);
assert.match(types, /productType:\s*"sms_package"/);
assert.match(checkout, /usePaymentCheckout/);
assert.match(checkout, /setDismissLocked\(true\)/);
assert.match(checkout, /closeSheet\(\(\)\s*=>/);
assert.match(checkout, /openSheet\("paymentStatus"/);
assert.doesNotMatch(checkout, /\bModal\b/);

console.log("Payment sheet registry contract passed");
