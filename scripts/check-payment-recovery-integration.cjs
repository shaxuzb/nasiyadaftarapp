const assert = require("node:assert/strict");
const fs = require("node:fs");

const gate = fs.readFileSync(
  "src/modules/payments/components/PaymentRecoveryGate.tsx",
  "utf8",
);
const app = fs.readFileSync("App.tsx", "utf8");

assert.match(gate, /shouldRecoverPendingPayment/);
assert.match(gate, /getPendingPayment/);
assert.match(gate, /useAppLock/);
assert.match(gate, /useBottomSheet/);
assert.match(gate, /isBootstrapping/);
assert.match(gate, /openSheet\("paymentStatus"/);
assert.match(gate, /recoveredOrderId/);
assert.match(app, /PaymentRecoveryGate/);
assert.match(app, /enabled={!showOnboarding}/);

console.log("Payment recovery integration contract passed");
