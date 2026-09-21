import type { PendingPaymentReference } from "../types";

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

export type PendingPaymentRedirect =
  | { type: "paymentStatus"; orderId: number }
  | { type: "pendingPayments"; payments: PendingPaymentReference[] };

export function getPendingPaymentRedirect(
  payments: PendingPaymentReference[],
): PendingPaymentRedirect | null {
  if (payments.length === 0) return null;
  if (payments.length === 1) {
    return { type: "paymentStatus", orderId: payments[0].orderId };
  }
  return { type: "pendingPayments", payments };
}

export class PendingPaymentCheckoutError extends Error {
  readonly redirect: PendingPaymentRedirect;

  constructor(redirect: PendingPaymentRedirect) {
    super("PAYMENT_PENDING");
    this.name = "PendingPaymentCheckoutError";
    this.redirect = redirect;
    Object.setPrototypeOf(this, PendingPaymentCheckoutError.prototype);
  }
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
