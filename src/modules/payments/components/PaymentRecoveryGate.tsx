import { useEffect, useRef, useState } from "react";

import { useBottomSheet } from "../../../bottom-sheet";
import { useAuth } from "../../../context/AuthContext";
import { useAppLock } from "../../pin-auth/context/AppLockContext";
import { getPendingPayment } from "../services/paymentStorage";
import { shouldRecoverPendingPayment } from "../utils/paymentRecovery";

interface PaymentRecoveryGateProps {
  enabled: boolean;
}

export function PaymentRecoveryGate({ enabled }: PaymentRecoveryGateProps) {
  const { user, isBootstrapping } = useAuth();
  const { isResolving, setupRequired, isLocked } = useAppLock();
  const { isOpen, openSheet } = useBottomSheet();
  const [pendingOrderId, setPendingOrderId] = useState<number | null>(null);
  const recoveredOrderId = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    if (!enabled || isBootstrapping || !user) {
      setPendingOrderId(null);
      if (!user) recoveredOrderId.current = null;
      return () => {
        active = false;
      };
    }

    void getPendingPayment(user.id)
      .then((pending) => {
        if (!active) return;
        setPendingOrderId(pending?.orderId ?? null);
      })
      .catch(() => {
        if (active) setPendingOrderId(null);
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
    setupRequired,
    user,
  ]);

  return null;
}
