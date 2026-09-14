import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  createSmsPackagePayment,
  createSubscriptionPayment,
  cancelPayment,
  getPayment,
  syncPayment,
} from "../services/paymentService";
import {
  clearCheckoutAttempt,
  clearPendingPayment,
  getOrCreateCheckoutAttempt,
  getPendingPayment,
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

export function usePaymentCheckout() {
  const { user, refreshSubscription } = useAuth();
  const queryClient = useQueryClient();
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
        getPayment,
        getCheckoutUrl: getPaymentCheckoutUrl,
        shouldPersistPending: shouldPersistPendingPayment,
        isFulfilled: isPaymentFulfilled,
        onCanonicalOrder: async (order) => {
          queryClient.setQueryData(queryKeys.payment(order.id), order);
          await queryClient.invalidateQueries({
            queryKey: queryKeys.paymentsHistoryRoot(),
          });
        },
        onFulfilled: async () => {
          await refreshSubscription();
        },
      }),
    [queryClient, refreshSubscription],
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
      const request = core.startCheckout({ ...input, userId: user.id });
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
