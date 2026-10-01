import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

import { useAuth } from "../../../context/AuthContext";
import { hasVerifiedPhone } from "../utils/accountStatus";
import {
  PhoneVerificationModal,
  PhoneVerificationPurpose,
} from "../components/PhoneVerificationModal";
import { useAppLock } from "../../pin-auth/context/AppLockContext";

interface AccountSecurityContextValue {
  openPhoneVerification: (
    afterVerified?: () => void,
    purpose?: PhoneVerificationPurpose,
  ) => void;
  requireVerifiedPhone: (
    onVerified: () => void,
    purpose?: PhoneVerificationPurpose,
  ) => boolean;
}

const AccountSecurityContext = createContext<
  AccountSecurityContextValue | undefined
>(undefined);

export function AccountSecurityProvider({ children }: { children: ReactNode }) {
  const { user, linkPhoneWithCode } = useAuth();
  const { isResolving, setupRequired, isLocked } = useAppLock();
  const [visible, setVisible] = useState(false);
  // Kept after close so the text does not change while the modal fades out;
  // every open sets it again.
  const [purpose, setPurpose] = useState<PhoneVerificationPurpose>();
  const afterVerifiedRef = useRef<(() => void) | undefined>(undefined);
  // What to continue with once verification succeeded and the modal is gone.
  const afterClosedRef = useRef<(() => void) | undefined>(undefined);

  const runAfterClosed = useCallback(() => {
    const afterClosed = afterClosedRef.current;
    afterClosedRef.current = undefined;
    afterClosed?.();
  }, []);

  const closePhoneVerification = useCallback(() => {
    setVisible(false);
    afterVerifiedRef.current = undefined;
    // What follows usually opens its own modal (the SMS send confirmation).
    // iOS cannot present it while this one is still animating out, so there
    // it continues from the modal's onDismiss, which Android does not fire.
    if (Platform.OS !== "ios") runAfterClosed();
  }, [runAfterClosed]);

  const openPhoneVerification = useCallback(
    (afterVerified?: () => void, nextPurpose?: PhoneVerificationPurpose) => {
      afterVerifiedRef.current = afterVerified;
      setPurpose(nextPurpose);
      setVisible(true);
    },
    [],
  );

  const requireVerifiedPhone = useCallback(
    (onVerified: () => void, nextPurpose?: PhoneVerificationPurpose) => {
      if (hasVerifiedPhone(user)) {
        onVerified();
        return true;
      }
      openPhoneVerification(onVerified, nextPurpose);
      return false;
    },
    [openPhoneVerification, user],
  );

  useEffect(() => {
    if (isResolving || setupRequired || isLocked) {
      closePhoneVerification();
    }
  }, [closePhoneVerification, isLocked, isResolving, setupRequired]);

  const handleVerified = useCallback(
    async (phoneNumber: string, code: string) => {
      await linkPhoneWithCode(phoneNumber, code);
      // The modal closes right after this resolves; the action continues then.
      afterClosedRef.current = afterVerifiedRef.current;
      afterVerifiedRef.current = undefined;
    },
    [linkPhoneWithCode],
  );

  const value = useMemo<AccountSecurityContextValue>(
    () => ({ openPhoneVerification, requireVerifiedPhone }),
    [openPhoneVerification, requireVerifiedPhone],
  );

  return (
    <AccountSecurityContext.Provider value={value}>
      {children}
      <PhoneVerificationModal
        visible={visible}
        purpose={purpose}
        currentPhone={user?.phoneNumber}
        onDismiss={closePhoneVerification}
        onClosed={runAfterClosed}
        onVerified={handleVerified}
      />
    </AccountSecurityContext.Provider>
  );
}

export function useAccountSecurity() {
  const context = useContext(AccountSecurityContext);
  if (!context) {
    throw new Error(
      "useAccountSecurity must be used inside AccountSecurityProvider",
    );
  }
  return context;
}
