import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Linking } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import type { PaymentOrder } from "../types";
import {
  cancelPayment,
  createSmsPackagePayment,
  createSubscriptionPayment,
  syncPayment,
} from "../services/paymentService";
import {
  clearCheckoutAttempt,
  clearPendingPayment,
  getOrCreateCheckoutAttempt,
  getPendingPayment,
  savePendingPayment,
} from "../services/paymentStorage";
import { createPaymentLifecycleCore } from "../services/paymentLifecycleCore";
import { getPaymentCheckoutUrl } from "../utils/paymentUrl";
import {
  isPaymentFulfilled,
  shouldPersistPendingPayment,
} from "../utils/paymentState";
import { usePayment } from "./usePaymentQueries";

export interface UsePaymentOrderLifecycleOptions {
  syncOnForeground?: boolean;
}

function namedError(name: string) {
  const error = new Error(name);
  error.name = name;
  return error;
}

export function usePaymentOrderLifecycle(
  orderId: number,
  { syncOnForeground = false }: UsePaymentOrderLifecycleOptions = {},
) {
  const { user, refreshSubscription } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const orderQuery = usePayment(orderId);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isOpeningCheckout, setIsOpeningCheckout] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const appStateRef = useRef(AppState.currentState);

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

  const sync = useCallback(async (): Promise<PaymentOrder> => {
    if (!user) throw namedError("PAYMENT_AUTH_REQUIRED");
    setActionError(null);
    setIsSyncing(true);
    try {
      return await core.syncOrder(user.id, orderId);
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [core, orderId, user]);

  const cancel = useCallback(async (): Promise<PaymentOrder> => {
    if (!user) throw namedError("PAYMENT_AUTH_REQUIRED");
    setActionError(null);
    setIsCancelling(true);
    try {
      return await core.cancelOrder(user.id, orderId);
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setIsCancelling(false);
    }
  }, [core, orderId, user]);

  const openCheckout = useCallback(async (): Promise<string> => {
    if (!user) throw namedError("PAYMENT_AUTH_REQUIRED");
    const order =
      queryClient.getQueryData<PaymentOrder>(queryKeys.payment(orderId)) ??
      orderQuery.data;
    if (!order) throw namedError("PAYMENT_ORDER_NOT_LOADED");

    const url = getPaymentCheckoutUrl(order);
    if (!url) throw namedError("PAYMENT_CHECKOUT_URL_MISSING");

    setActionError(null);
    setIsOpeningCheckout(true);
    try {
      await Linking.openURL(url);
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
        await queryClient.invalidateQueries({
          queryKey: queryKeys.pendingPayment(user.id),
        });
      }
      return url;
    } catch (error) {
      setActionError(error);
      throw error;
    } finally {
      setIsOpeningCheckout(false);
    }
  }, [orderId, orderQuery.data, queryClient, user]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;
      if (
        !syncOnForeground ||
        !user ||
        nextState !== "active" ||
        (previousState !== "background" && previousState !== "inactive")
      ) {
        return;
      }

      void (async () => {
        const pending = await getPendingPayment(user.id, orderId);
        if (pending?.orderId === orderId && pending.openedExternally) {
          await sync();
        }
      })().catch(() => undefined);
    });

    return () => subscription.remove();
  }, [orderId, sync, syncOnForeground, user]);

  return {
    order: orderQuery.data ?? null,
    isLoading: orderQuery.isPending,
    isFetching: orderQuery.isFetching,
    isSyncing,
    isCancelling,
    isOpeningCheckout,
    error: actionError ?? orderQuery.error,
    refetch: orderQuery.refetch,
    sync,
    cancel,
    openCheckout,
  };
}
