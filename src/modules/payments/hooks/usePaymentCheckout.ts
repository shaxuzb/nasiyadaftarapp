import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import { cancelCurrentSubscription } from "../../subscription/services/subscriptionService";
import {
  createSmsPackagePayment,
  createSubscriptionPayment,
  cancelPayment,
  syncPayment,
} from "../services/paymentService";
import {
  clearCheckoutAttempt,
  clearPendingPayment,
  getOrCreateCheckoutAttempt,
  getPendingPayment,
  getPendingPayments,
  savePendingPayment,
} from "../services/paymentStorage";
import {
  createPaymentLifecycleCore,
  type StartPaymentCheckoutInput,
  type StartPaymentCheckoutResult,
} from "../services/paymentLifecycleCore";
import { getPaymentCheckoutUrl } from "../utils/paymentUrl";
import {
  isPaymentFulfilled,
  shouldPersistPendingPayment,
} from "../utils/paymentState";
import {
  getPendingPaymentRedirect,
  PendingPaymentCheckoutError,
} from "../utils/paymentRecovery";

export function usePaymentCheckout() {
  const { user, refreshSubscription } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const [isCreating, setIsCreating] = useState(false);
  const inFlightRef = useRef<Promise<StartPaymentCheckoutResult> | null>(null);

  const core = useMemo(
    () =>
      createPaymentLifecycleCore({
        getOrCreateCheckoutAttempt,
        clearCheckoutAttempt,
        savePendingPayment,
        getPendingPayment,
        clearPendingPayment,
        createSubscriptionPayment,
        createSmsPackagePayment,
        syncPayment,
        cancelPayment,
        cancelCurrentSubscription,
        onSubscriptionCancellation: async () => {
          await refreshSubscription().catch(() => undefined);
        },
        getCheckoutUrl: getPaymentCheckoutUrl,
        shouldPersistPending: shouldPersistPendingPayment,
        isFulfilled: isPaymentFulfilled,
        onCanonicalOrder: async (order) => {
          queryClient.setQueryData(queryKeys.payment(order.id), order);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.paymentsHistoryRoot(),
          });
          if (userId !== null) {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.pendingPayment(userId),
            });
          }
        },
        onFulfilled: async () => {
          await refreshSubscription();
        },
      }),
    [queryClient, refreshSubscription, userId],
  );

  const startCheckout = useCallback(
    async (
      input: Omit<StartPaymentCheckoutInput, "userId">,
    ): Promise<StartPaymentCheckoutResult> => {
      if (!user) {
        const error = new Error("PAYMENT_AUTH_REQUIRED");
        error.name = "PAYMENT_AUTH_REQUIRED";
        throw error;
      }
      if (inFlightRef.current) return inFlightRef.current;

      setIsCreating(true);
      const request = (async () => {
        const pendingPayments = await getPendingPayments(user.id);
        const redirect = getPendingPaymentRedirect(pendingPayments);
        if (redirect) throw new PendingPaymentCheckoutError(redirect);
        return core.startCheckout({ ...input, userId: user.id });
      })();
      inFlightRef.current = request;
      try {
        return await request;
      } finally {
        if (inFlightRef.current === request) {
          inFlightRef.current = null;
        }
        setIsCreating(false);
      }
    },
    [core, user],
  );

  return { startCheckout, isCreating };
}
