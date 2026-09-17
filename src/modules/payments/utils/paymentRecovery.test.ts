// @ts-expect-error Node test runner loads the TypeScript module directly.
import { shouldRecoverPendingPayment } from "./paymentRecovery.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const ready = {
  enabled: true,
  hasUser: true,
  isAuthBootstrapping: false,
  isLockResolving: false,
  isLocked: false,
  setupRequired: false,
  isSheetOpen: false,
  pendingOrderId: 15,
  openedExternally: true,
  recoveredOrderId: null,
};

assert(shouldRecoverPendingPayment(ready), "Ready pending order must recover");
assert(!shouldRecoverPendingPayment({ ...ready, enabled: false }), "Onboarding-disabled recovery must stay closed");
assert(!shouldRecoverPendingPayment({ ...ready, hasUser: false }), "Anonymous session must not recover payment");
assert(!shouldRecoverPendingPayment({ ...ready, isAuthBootstrapping: true }), "Auth bootstrap must finish first");
assert(!shouldRecoverPendingPayment({ ...ready, isLockResolving: true }), "PIN state must resolve first");
assert(!shouldRecoverPendingPayment({ ...ready, isLocked: true }), "Locked app must not expose payment sheet");
assert(!shouldRecoverPendingPayment({ ...ready, setupRequired: true }), "Required PIN setup must stay in front");
assert(!shouldRecoverPendingPayment({ ...ready, isSheetOpen: true }), "Recovery must not replace another sheet");
assert(!shouldRecoverPendingPayment({ ...ready, openedExternally: false }), "A payment not opened externally must stay visible as a banner");
assert(!shouldRecoverPendingPayment({ ...ready, pendingOrderId: null }), "No persisted pending order means nothing to recover");
assert(!shouldRecoverPendingPayment({ ...ready, recoveredOrderId: 15 }), "Same order must not auto-open twice in one session");
assert(shouldRecoverPendingPayment({ ...ready, recoveredOrderId: 14 }), "A different pending order may recover");

console.log("Payment recovery guard tests passed");
