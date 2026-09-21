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
const checkoutHook = fs.readFileSync(
  "src/modules/payments/hooks/usePaymentCheckout.ts",
  "utf8",
);
const checkoutSheet = fs.readFileSync(
  "src/bottom-sheet/sheets/PaymentCheckoutSheet.tsx",
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
assert.match(gate, /openedExternally/);
assert.match(banner, /usePendingPayment/);
assert.match(banner, /usePayment/);
assert.match(banner, /openSheet\("paymentStatus"/);
assert.match(banner, /isPaymentTerminal/);
assert.match(customers, /PendingPaymentBanner/);
assert.match(customers, /navigation\.navigate\("Subscription"\)/);
assert.match(customers, /diamond-outline/);
assert.match(customers, /styles\.proButton/);
assert.match(customers, /isPremium/);
assert.match(customers, /showProBadge/);
assert.match(checkoutHook, /getPendingPayments/);
assert.match(checkoutHook, /getPendingPaymentRedirect/);
assert.match(checkoutHook, /PendingPaymentCheckoutError/);
assert.match(checkoutSheet, /PendingPaymentCheckoutError/);
assert.match(checkoutSheet, /openSheet\("pendingPayments"/);
assert.match(app, /PaymentRecoveryGate/);
assert.match(app, /<PaymentRecoveryGate\s+enabled=\{true\}\s*\/>/);

console.log("Payment recovery integration contract passed");
