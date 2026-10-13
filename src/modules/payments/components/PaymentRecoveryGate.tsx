import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { useBottomSheet } from "../../../bottom-sheet";
import { useAuth } from "../../../context/AuthContext";
import { useAppLock } from "../../pin-auth/context/AppLockContext";
import { takeAwaitedPaymentReturn } from "../services/paymentReturn";
import { getPendingPayments } from "../services/paymentStorage";
import { shouldRecoverPendingPayment } from "../utils/paymentRecovery";

interface PaymentRecoveryGateProps {
  enabled: boolean;
}

export function PaymentRecoveryGate({ enabled }: PaymentRecoveryGateProps) {
  const { user, isBootstrapping } = useAuth();
  const { isResolving, setupRequired, isLocked } = useAppLock();
  const { isOpen, openSheet } = useBottomSheet();
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const [pendingOpenedExternally, setPendingOpenedExternally] =
    useState(false);
  const recoveredOrderId = useRef<number | null>(null);
  const returnedOrderId = useRef<number | null>(null);

  // The checkout sheet sent the user to a payment page and closed. When the
  // app is in front again, that order becomes the one to show. Opening its
  // sheet is left to the effect below, which also waits for the PIN screen
  // and for any sheet still on its way out.
  useEffect(() => {
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener("change", (nextState) => {
      const cameBack = nextState === "active" && previousState !== "active";
      previousState = nextState;
      if (!cameBack) return;

      const orderId = takeAwaitedPaymentReturn();
      if (orderId === null) return;
      returnedOrderId.current = orderId;
      setPendingOrderId(orderId);
      setPendingOpenedExternally(true);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let active = true;

    if (!enabled || isBootstrapping || !user) {
      setPendingOrderId(null);
      setPendingOpenedExternally(false);
      if (!user) recoveredOrderId.current = null;
      return () => {
        active = false;
      };
    }

    void getPendingPayments(user.id)
      .then((payments) => {
        if (!active) return;
        const recoverable = payments.find((item) => item.openedExternally);
        setPendingOrderId(recoverable?.orderId ?? null);
        setPendingOpenedExternally(recoverable?.openedExternally === true);
      })
      .catch(() => {
        if (active) {
          setPendingOrderId(null);
          setPendingOpenedExternally(false);
        }
      });

    return () => {
      active = false;
    };
  }, [enabled, isBootstrapping, user?.id]);

  useEffect(() => {
    if (
      !shouldRecoverPendingPayment({
        enabled,
        hasUser: Boolean(user),
        isAuthBootstrapping: isBootstrapping,
        isLockResolving: isResolving,
        isLocked,
        setupRequired,
        isSheetOpen: isOpen,
        pendingOrderId,
        openedExternally: pendingOpenedExternally,
        recoveredOrderId: recoveredOrderId.current,
      })
    ) {
      return;
    }

    const orderId = pendingOrderId as number;
    recoveredOrderId.current = orderId;
    // Straight back from paying: what the app knows is from before the user
    // left, so the sheet asks the server as it opens.
    const justReturned = orderId === returnedOrderId.current;
    openSheet("paymentStatus", justReturned ? { orderId, syncOnMount: true } : { orderId });
  }, [
    enabled,
    isBootstrapping,
    isLocked,
    isOpen,
    isResolving,
    openSheet,
    pendingOrderId,
    pendingOpenedExternally,
    setupRequired,
    user,
  ]);

  return null;
}
