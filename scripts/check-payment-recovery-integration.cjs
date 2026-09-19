const assert = require("node:assert/strict");
const fs = require("node:fs");

const gate = fs.readFileSync(
  "src/modules/payments/components/PaymentRecoveryGate.tsx",
  "utf8",
);
const banner = fs.readFileSync(
  "src/modules/payments/components/PendingPaymentBanner.tsx",
  "utf8",
);
const customers = fs.readFileSync("src/screens/CustomersScreen.tsx", "utf8");
const app = fs.readFileSync("App.tsx", "utf8");

assert.match(gate, /shouldRecoverPendingPayment/);
assert.match(gate, /getPendingPayment/);
assert.match(gate, /useAppLock/);
assert.match(gate, /useBottomSheet/);
assert.match(gate, /isBootstrapping/);
assert.match(gate, /openSheet\("paymentStatus"/);
assert.match(gate, /recoveredOrderId/);
assert.match(gate, /openedExternally/);
assert.match(banner, /usePendingPayment/);
assert.match(banner, /usePayment/);
assert.match(banner, /openSheet\("paymentStatus"/);
assert.match(banner, /isPaymentTerminal/);
assert.match(customers, /PendingPaymentBanner/);
assert.match(app, /PaymentRecoveryGate/);
assert.match(app, /<PaymentRecoveryGate\s+enabled=\{true\}\s*\/>/);

console.log("Payment recovery integration contract passed");
