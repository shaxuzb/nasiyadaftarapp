import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import { getPayment, getPayments } from "../services/paymentService";
import { getPendingPayments } from "../services/paymentStorage";

export function usePendingPayments() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return useQuery({
    queryKey: queryKeys.pendingPayment(userId ?? "anonymous"),
    queryFn: () => {
      if (userId === null) throw new Error("PAYMENT_AUTH_REQUIRED");
      return getPendingPayments(userId);
    },
    enabled: userId !== null,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function usePendingPayment() {
  const query = usePendingPayments();
  return { ...query, data: query.data?.[0] ?? null };
}

export function usePaymentHistory(limit = 30) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.paymentsHistory(limit),
    queryFn: ({ signal }) => getPayments(limit, signal),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
}

export function usePayment(orderId: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.payment(orderId),
    queryFn: ({ signal }) => getPayment(orderId, signal),
    enabled: Boolean(user && Number.isSafeInteger(orderId) && orderId > 0),
    staleTime: 15_000,
  });
}
