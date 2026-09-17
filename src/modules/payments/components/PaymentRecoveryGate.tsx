import { useEffect, useRef, useState } from "react";

import { useBottomSheet } from "../../../bottom-sheet";
import { useAuth } from "../../../context/AuthContext";
import { useAppLock } from "../../pin-auth/context/AppLockContext";
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
    openSheet("paymentStatus", { orderId });
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
