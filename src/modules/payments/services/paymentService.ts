import { apiClient } from "../../../services/axiosService";
import type { PaymentOrder } from "../types";
import { parsePaymentOrder, parsePaymentOrders } from "../utils/paymentParsing";
import {
  parsePaymentProviders,
  type PaymentProvider,
} from "../utils/paymentProviders";

export async function getPaymentProviders(
  signal?: AbortSignal,
): Promise<PaymentProvider[]> {
  const response = await apiClient.get("/payments/providers", { signal });
  return parsePaymentProviders(response.data);
}

// The provider goes in the query string. Left out, the server uses its own
// default, which is also what an app without the provider list does.
const withProvider = (provider?: string | null) =>
  provider ? { params: { provider } } : {};

function normalizePaymentHistoryLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Invalid payment history limit");
  }
  return limit;
}

export async function createSubscriptionPayment(
  planId: number,
  idempotencyKey: string,
  provider?: string | null,
): Promise<PaymentOrder> {
  const response = await apiClient.post(
    `/payments/subscriptions/${planId}`,
    undefined,
    { headers: { "Idempotency-Key": idempotencyKey }, ...withProvider(provider) },
  );
  return parsePaymentOrder(response.data);
}

export async function createSmsPackagePayment(
  packageId: number,
  idempotencyKey: string,
  provider?: string | null,
): Promise<PaymentOrder> {
  const response = await apiClient.post(
    `/payments/sms-packages/${packageId}`,
    undefined,
    { headers: { "Idempotency-Key": idempotencyKey }, ...withProvider(provider) },
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

/** No plan ID and no request body; the server renews the current plan. */
export async function createSubscriptionRenewalPayment(idempotencyKey: string): Promise<PaymentOrder> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    throw new Error("Invalid payment idempotency key");
  }
  const response = await apiClient.post(
    "/payments/subscriptions/renew",
    undefined,
    { params: { provider: "payme" }, headers: { "Idempotency-Key": idempotencyKey } },
  );
  return parsePaymentOrder(response.data);
}
