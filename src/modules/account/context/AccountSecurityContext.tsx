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

import { useAuth } from "../../../context/AuthContext";
import { hasVerifiedPhone } from "../utils/accountStatus";
import { PhoneVerificationModal } from "../components/PhoneVerificationModal";
import { useAppLock } from "../../pin-auth/context/AppLockContext";

interface AccountSecurityContextValue {
  openPhoneVerification: (afterVerified?: () => void) => void;
  requireVerifiedPhone: (onVerified: () => void) => boolean;
}

const AccountSecurityContext = createContext<
  AccountSecurityContextValue | undefined
>(undefined);

export function AccountSecurityProvider({ children }: { children: ReactNode }) {
  const { user, currentOrganization, updateUserProfile } = useAuth();
  const { isResolving, setupRequired, isLocked } = useAppLock();
  const [visible, setVisible] = useState(false);
  const afterVerifiedRef = useRef<(() => void) | undefined>(undefined);
  const promptedUserIdRef = useRef<number | null>(null);

  const closePhoneVerification = useCallback(() => {
    setVisible(false);
    afterVerifiedRef.current = undefined;
  }, []);

  const openPhoneVerification = useCallback((afterVerified?: () => void) => {
    afterVerifiedRef.current = afterVerified;
    setVisible(true);
  }, []);

  const requireVerifiedPhone = useCallback(
    (onVerified: () => void) => {
      if (hasVerifiedPhone(user)) {
        onVerified();
        return true;
      }
      openPhoneVerification(onVerified);
      return false;
    },
    [openPhoneVerification, user],
  );

  useEffect(() => {
    const pinGateCleared = !isResolving && !setupRequired && !isLocked;
    const isGoogleUser = [
      user?.authProvider,
      user?.loginTypeCode,
      user?.loginType,
    ].some((value) => value?.toLocaleUpperCase().includes("GOOGLE"));
    if (
      !pinGateCleared ||
      !currentOrganization ||
      !user ||
      !isGoogleUser ||
      hasVerifiedPhone(user) ||
      promptedUserIdRef.current === user.id
    ) {
      return;
    }

    promptedUserIdRef.current = user.id;
    openPhoneVerification();
  }, [
    currentOrganization,
    isLocked,
    isResolving,
    openPhoneVerification,
    setupRequired,
    user,
  ]);

  useEffect(() => {
    if (isResolving || setupRequired || isLocked) {
      closePhoneVerification();
    }
  }, [closePhoneVerification, isLocked, isResolving, setupRequired]);

  const handleVerified = useCallback(
    async (phoneNumber: string) => {
      await updateUserProfile({ phoneNumber, phoneVerified: true });
      const afterVerified = afterVerifiedRef.current;
      afterVerifiedRef.current = undefined;
      afterVerified?.();
    },
    [updateUserProfile],
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
        currentPhone={user?.phoneNumber}
        onDismiss={closePhoneVerification}
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
