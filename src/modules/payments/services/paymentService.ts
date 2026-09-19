import { apiClient } from "../../../services/axiosService";
import type { PaymentOrder } from "../types";
import { parsePaymentOrder, parsePaymentOrders } from "../utils/paymentParsing";

function normalizePaymentHistoryLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid payment history limit");
  }
  return limit;
}

export async function createSubscriptionPayment(
  planId: number,
  idempotencyKey: string,
): Promise<PaymentOrder> {
  const response = await apiClient.post(
    `/payments/subscriptions/${planId}`,
    undefined,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return parsePaymentOrder(response.data);
}

export async function createSmsPackagePayment(
  packageId: number,
  idempotencyKey: string,
): Promise<PaymentOrder> {
  const response = await apiClient.post(
    `/payments/sms-packages/${packageId}`,
    undefined,
    { headers: { "Idempotency-Key": idempotencyKey } },
  );
  return parsePaymentOrder(response.data);
}

export async function syncPayment(orderId: number): Promise<PaymentOrder> {
  const response = await apiClient.post(`/payments/${orderId}/sync`, undefined);
  return parsePaymentOrder(response.data);
}

export async function getPayments(
  limit = 30,
  signal?: AbortSignal,
): Promise<PaymentOrder[]> {
  const normalizedLimit = normalizePaymentHistoryLimit(limit);
  const response = await apiClient.get("/payments", {
    params: { limit: normalizedLimit },
    signal,
  });
  return parsePaymentOrders(response.data);
}

export async function getPayment(
  orderId: number,
  signal?: AbortSignal,
): Promise<PaymentOrder> {
  const response = await apiClient.get(`/payments/${orderId}`, { signal });
  return parsePaymentOrder(response.data);
}

export async function cancelPayment(orderId: number): Promise<PaymentOrder> {
  const response = await apiClient.post(`/payments/${orderId}/cancel`, undefined);
  return parsePaymentOrder(response.data);
}
