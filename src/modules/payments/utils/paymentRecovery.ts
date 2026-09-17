export interface PendingPaymentRecoveryState {
  enabled: boolean;
  hasUser: boolean;
  isAuthBootstrapping: boolean;
  isLockResolving: boolean;
  isLocked: boolean;
  setupRequired: boolean;
  isSheetOpen: boolean;
  pendingOrderId: number | null;
  openedExternally: boolean;
  recoveredOrderId: number | null;
}

export function shouldRecoverPendingPayment(
  state: PendingPaymentRecoveryState,
): boolean {
  if (!state.enabled) return false;
  if (!state.hasUser) return false;
  if (state.isAuthBootstrapping) return false;
  if (state.isLockResolving) return false;
  if (state.isLocked || state.setupRequired) return false;
  if (state.isSheetOpen) return false;
  if (state.pendingOrderId === null) return false;
  if (!state.openedExternally) return false;
  if (state.recoveredOrderId === state.pendingOrderId) return false;
  return true;
}
