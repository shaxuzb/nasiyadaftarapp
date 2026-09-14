type PaymentState = {
  status: "pending" | "paid" | "cancelled" | "failed" | "expired";
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
    order.status === "expired"
  );
}

export function shouldPersistPendingPayment(order: PaymentState): boolean {
  return !isPaymentTerminal(order);
}
