import { useCallback, useMemo, useRef, useState } from "react";
import { Linking } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
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
import {
  awaitPaymentReturn,
  takeAwaitedPaymentReturn,
} from "../services/paymentReturn";
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

  // Sends the user to the provider's page for the order just created.
  //
  // Everything the way back depends on is written before the page opens,
  // because the system may suspend the app the moment it does: the order is
  // stored as "being paid outside the app", and a note says which order to
  // show the status of when the app is in front again.
  const openCheckoutPage = useCallback(
    async ({ order, checkoutUrl }: StartPaymentCheckoutResult) => {
      if (!user) {
        const error = new Error("PAYMENT_AUTH_REQUIRED");
        error.name = "PAYMENT_AUTH_REQUIRED";
        throw error;
      }
      if (!checkoutUrl) {
        const error = new Error("PAYMENT_CHECKOUT_URL_MISSING");
        error.name = "PAYMENT_CHECKOUT_URL_MISSING";
        throw error;
      }

      if (shouldPersistPendingPayment(order)) {
        await savePendingPayment({
          version: 1,
          userId: user.id,
          orderId: order.id,
          productType: order.productType,
          productId: order.productId,
          openedExternally: true,
          updatedAt: new Date().toISOString(),
        });
      }
      awaitPaymentReturn(order.id);
      try {
        await Linking.openURL(checkoutUrl);
      } catch (error) {
        // Nobody left the app, so nobody is coming back.
        takeAwaitedPaymentReturn();
        throw error;
      }
    },
    [user],
  );

  return { startCheckout, openCheckoutPage, isCreating };
}
