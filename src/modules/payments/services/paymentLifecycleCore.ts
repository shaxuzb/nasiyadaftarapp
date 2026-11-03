import type {
  PaymentCheckoutAttempt,
  PaymentOrder,
  PaymentProductType,
  PendingPaymentReference,
} from "../types";

export interface StartPaymentCheckoutInput {
  userId: number;
  productType: PaymentProductType;
  productId: number;
  /** A code from the provider list; null or absent lets the server choose. */
  provider?: string | null;
  /** Subscriptions only: the term in months; absent means the server's one month. */
  months?: number | null;
  /**
   * Subscriptions only: more time on the plan the user already has, rather
   * than buying a plan. productId is then that plan's id.
   */
  renew?: boolean;
}

export interface StartPaymentCheckoutResult {
  order: PaymentOrder;
  checkoutUrl: string | null;
}

interface PaymentLifecycleDependencies {
  getOrCreateCheckoutAttempt(
    userId: number,
    productType: PaymentProductType,
    productId: number,
    provider?: string | null,
    variant?: string | null,
  ): Promise<PaymentCheckoutAttempt>;
  clearCheckoutAttempt(
    userId: number,
    productType: PaymentProductType,
    productId: number,
  ): Promise<void>;
  savePendingPayment(reference: PendingPaymentReference): Promise<void>;
  getPendingPayment?: (
    userId: number,
    orderId?: number,
  ) => Promise<PendingPaymentReference | null>;
  clearPendingPayment(userId: number, orderId?: number): Promise<void>;
  createSubscriptionPayment(
    productId: number,
    idempotencyKey: string,
    provider?: string | null,
    months?: number | null,
  ): Promise<PaymentOrder>;
  /** Optional: a caller that never renews does not have to provide it. */
  createSubscriptionRenewalPayment?: (
    idempotencyKey: string,
    provider?: string | null,
    months?: number | null,
  ) => Promise<PaymentOrder>;
  createSmsPackagePayment(
    productId: number,
    idempotencyKey: string,
    provider?: string | null,
  ): Promise<PaymentOrder>;
  syncPayment(orderId: number): Promise<PaymentOrder>;
  cancelPayment(orderId: number): Promise<PaymentOrder>;
  getCheckoutUrl(order: PaymentOrder): string | null;
  shouldPersistPending(order: PaymentOrder): boolean;
  isFulfilled(order: PaymentOrder): boolean;
  onCanonicalOrder(order: PaymentOrder): Promise<void>;
  onFulfilled(order: PaymentOrder): Promise<void>;
  nowIso?: () => string;
}

export function createPaymentLifecycleCore({
  getOrCreateCheckoutAttempt,
  clearCheckoutAttempt,
  savePendingPayment,
  getPendingPayment,
  clearPendingPayment,
  createSubscriptionPayment,
  createSubscriptionRenewalPayment,
  createSmsPackagePayment,
  syncPayment,
  cancelPayment,
  getCheckoutUrl,
  shouldPersistPending,
  isFulfilled,
  onCanonicalOrder,
  onFulfilled,
  nowIso = () => new Date().toISOString(),
}: PaymentLifecycleDependencies) {
  const inFlightSyncs = new Map<string, Promise<PaymentOrder>>();

  async function handleCanonicalOrder(
    userId: number,
    order: PaymentOrder,
  ): Promise<PaymentOrder> {
    if (shouldPersistPending(order)) {
      const current = await getPendingPayment?.(userId, order.id);
      await savePendingPayment({
        version: 1,
        userId,
        orderId: order.id,
        productType: order.productType,
        productId: order.productId,
        openedExternally:
          current?.orderId === order.id ? current.openedExternally : false,
        updatedAt: nowIso(),
      });
    } else {
      await clearPendingPayment(userId, order.id);
    }

    await onCanonicalOrder(order);
    if (isFulfilled(order)) {
      await onFulfilled(order);
    }
    return order;
  }

  async function startCheckout(
    input: StartPaymentCheckoutInput,
  ): Promise<StartPaymentCheckoutResult> {
    const provider = input.provider ?? null;
    const isSubscription = input.productType === "subscription";
    const months =
      isSubscription && typeof input.months === "number" ? input.months : null;
    const renew = isSubscription && input.renew === true;
    const variant =
      [renew ? "renew" : null, months !== null ? `m${months}` : null]
        .filter(Boolean)
        .join(":") || null;
    const attempt = await getOrCreateCheckoutAttempt(
      input.userId,
      input.productType,
      input.productId,
      provider,
      variant,
    );

    let order: PaymentOrder;
    if (renew) {
      if (!createSubscriptionRenewalPayment) {
        throw new Error("Subscription renewal is not available here");
      }
      order = await createSubscriptionRenewalPayment(
        attempt.idempotencyKey,
        provider,
        months,
      );
    } else if (isSubscription) {
      order = await createSubscriptionPayment(
        input.productId,
        attempt.idempotencyKey,
        provider,
        months,
      );
    } else {
      order = await createSmsPackagePayment(
        input.productId,
        attempt.idempotencyKey,
        provider,
      );
    }

    await clearCheckoutAttempt(
      input.userId,
      input.productType,
      input.productId,
    );
    await handleCanonicalOrder(input.userId, order);

    return {
      order,
      checkoutUrl: isFulfilled(order) ? null : getCheckoutUrl(order),
    };
  }

  function syncOrder(userId: number, orderId: number): Promise<PaymentOrder> {
    const key = `${userId}:${orderId}`;
    const existing = inFlightSyncs.get(key);
    if (existing) return existing;

    const request = (async () => {
      // Activating a paid subscription is entirely server-side. The client used
      // to cancel the previous plan here and re-sync, but that endpoint is gone;
      // calling it would fail the sync and leave a paid order looking unpaid.
      const order = await syncPayment(orderId);
      return handleCanonicalOrder(userId, order);
    })();
    inFlightSyncs.set(key, request);

    const cleanup = () => {
      if (inFlightSyncs.get(key) === request) {
        inFlightSyncs.delete(key);
      }
    };
    void request.then(cleanup, cleanup);
    return request;
  }

  async function cancelOrder(
    userId: number,
    orderId: number,
  ): Promise<PaymentOrder> {
    const cancelled = await cancelPayment(orderId);
    return handleCanonicalOrder(userId, cancelled);
  }

  return {
    startCheckout,
    syncOrder,
    cancelOrder,
    handleCanonicalOrder,
  };
}
