type PaymentState = {
  status:
    | "pending"
    | "holding"
    | "paid"
    | "cancelled"
    | "failed"
    | "expired"
    | "refunded";
  isFulfilled: boolean;
};

export function isPaymentFulfilled(order: PaymentState): boolean {
  return order.status === "paid" && order.isFulfilled;
}

export function isPaymentTerminal(order: PaymentState): boolean {
  return (
    isPaymentFulfilled(order) ||
    order.status === "cancelled" ||
    order.status === "failed" ||
    order.status === "expired" ||
    order.status === "refunded"
  );
}

export function shouldPersistPendingPayment(order: PaymentState): boolean {
  return !isPaymentTerminal(order);
}
