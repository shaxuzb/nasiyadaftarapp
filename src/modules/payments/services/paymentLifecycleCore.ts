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
  ): Promise<PaymentOrder>;
  createSmsPackagePayment(
    productId: number,
    idempotencyKey: string,
  ): Promise<PaymentOrder>;
  syncPayment(orderId: number): Promise<PaymentOrder>;
  cancelPayment(orderId: number): Promise<void>;
  getPayment(orderId: number): Promise<PaymentOrder>;
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
  createSmsPackagePayment,
  syncPayment,
  cancelPayment,
  getPayment,
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
    const attempt = await getOrCreateCheckoutAttempt(
      input.userId,
      input.productType,
      input.productId,
    );

    const order =
      input.productType === "subscription"
        ? await createSubscriptionPayment(
            input.productId,
            attempt.idempotencyKey,
          )
        : await createSmsPackagePayment(
            input.productId,
            attempt.idempotencyKey,
          );

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
    await cancelPayment(orderId);
    const canonical = await getPayment(orderId);
    return handleCanonicalOrder(userId, canonical);
  }

  return {
    startCheckout,
    syncOrder,
    cancelOrder,
    handleCanonicalOrder,
  };
}
