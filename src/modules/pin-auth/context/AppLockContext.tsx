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
import { AppState } from "react-native";
import { useAuth } from "../../../context/AuthContext";
import {
  getBiometricCapability,
  authenticateWithBiometrics,
} from "../services/biometricAuth";
import { pinStorage } from "../services/pinStorage";
import { createPinSecurity } from "../services/pinSecurity";
import type { BiometricCapability } from "../types";
import { validatePin } from "../utils/pinValidation";
import { shouldLockAfterInactivity } from "../utils/appInactivity";
import type { PinErrorCode } from "../utils/pinErrors";
import { useTranslation } from "../../../i18n";

type UnlockResult = {
  status: "unlocked" | "invalid" | "logged-out";
  attemptsRemaining: number;
};
interface AppLockValue {
  isResolving: boolean;
  setupRequired: boolean;
  pinEnabled: boolean;
  isLocked: boolean;
  biometric: BiometricCapability | null;
  biometricEnabled: boolean;
  displayName: string;
  submitSetupPin(pin: string): Promise<void>;
  submitUnlockPin(pin: string): Promise<UnlockResult>;
  verifyCurrentPin(pin: string): Promise<boolean>;
  unlockWithBiometrics(): Promise<boolean>;
  changePin(
    currentPin: string,
    nextPin: string,
  ): Promise<{ success: boolean; message?: string; code?: PinErrorCode }>;
  setBiometricEnabled(
    enabled: boolean,
  ): Promise<{ success: boolean; message?: string; code?: PinErrorCode }>;
  removePin(): Promise<{ success: boolean; message?: string; code?: PinErrorCode }>;
  resetPinAndLogout(): Promise<void>;
  startPinSetup(): void;
  lockNow(): void;
}
const AppLockContext = createContext<AppLockValue | undefined>(undefined);
function maskedContact(phone?: string | null, email?: string | null) {
  if (phone)
    return phone.replace(/(\+\d{3}\s?\d{2})\d+(\d{2})$/, "$1 *** ** $2");
  return email ?? null;
}
const wait = (duration: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, duration));

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, isBootstrapping, logout } = useAuth();
  const { t } = useTranslation();
  const [isResolving, setResolving] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [isLocked, setLocked] = useState(false);
  const [biometric, setBiometric] = useState<BiometricCapability | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const userIdRef = useRef<number | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const inactiveSinceRef = useRef<number | null>(null);
  const authenticate = useCallback(
    () =>
      authenticateWithBiometrics(
        t("security.biometricPrompt"),
        t("security.biometricPromptDescription"),
      ),
    [t],
  );
  const security = useMemo(
    () => createPinSecurity(pinStorage, validatePin, authenticate),
    [authenticate],
  );
  useEffect(() => {
    let active = true;
    const load = async () => {
      if (isBootstrapping) return;
      setResolving(true);
      userIdRef.current = user?.id ?? null;
      if (!user) {
        if (active) {
          setSetupRequired(false);
          setPinEnabled(false);
          setLocked(false);
          setBiometric(null);
          setBiometricEnabledState(false);
          setResolvedUserId(null);
          setResolving(false);
        }
        return;
      }
      const [record, pinSetupComplete, capability] = await Promise.all([
        pinStorage.getPinRecord(user.id),
        pinStorage.isPinSetupComplete(user.id),
        getBiometricCapability().catch(() => null),
      ]);
      if (!active || userIdRef.current !== user.id) return;
      const updatedRecord = await pinStorage.updateDisplayMetadata(
        user.id,
        user.fullName,
        maskedContact(user.phoneNumber, user.email),
      );
      if (active) {
        const hasPin = Boolean(record);
        setSetupRequired(!hasPin && !pinSetupComplete);
        setPinEnabled(hasPin);
        setLocked(hasPin);
        setBiometric(capability);
        setBiometricEnabled(
          updatedRecord?.biometricEnabled ?? record?.biometricEnabled ?? false,
        );
        setResolvedUserId(user.id);
        setResolving(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isBootstrapping, user?.id]);

  useEffect(() => {
    if (isBootstrapping || !user || !pinEnabled) {
      inactiveSinceRef.current = null;
      appStateRef.current = AppState.currentState;
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      if (
        (nextState === "inactive" || nextState === "background") &&
        previousState === "active"
      ) {
        inactiveSinceRef.current = Date.now();
      }

      if (nextState === "active") {
        if (shouldLockAfterInactivity(inactiveSinceRef.current, Date.now())) {
          setLocked(true);
        }
        inactiveSinceRef.current = null;
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [isBootstrapping, pinEnabled, user?.id]);
  const submitSetupPin = useCallback(
    async (pin: string) => {
      if (!user) throw new Error("Foydalanuvchi topilmadi");
      const validation = validatePin(pin);
      if (!validation.valid) throw new Error(validation.code);
      await pinStorage.setPin({
        userId: user.id,
        pin,
        displayName: user.fullName,
        maskedContact: maskedContact(user.phoneNumber, user.email),
      });
      let enabled = false;
      if (biometric?.available) {
        try {
          enabled = await authenticate();
          if (enabled) await pinStorage.setBiometricEnabled(user.id, true);
        } catch {
          // Biometric setup is optional; PIN login remains available if it is cancelled.
        }
      }
      setSetupRequired(false);
      setPinEnabled(true);
      setLocked(false);
      setBiometricEnabledState(enabled);
    },
    [authenticate, biometric, user],
  );
  const submitUnlockPin = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      if (!user) return { status: "invalid", attemptsRemaining: 0 };
      const result = await security.checkPin(user.id, pin);
      if (result.success) {
        await wait(220);
        setLocked(false);
        return {
          status: "unlocked",
          attemptsRemaining: result.attemptsRemaining,
        };
      }
      if (result.mustLogout) {
        await logout();
        return { status: "logged-out", attemptsRemaining: 0 };
      }
      return { status: "invalid", attemptsRemaining: result.attemptsRemaining };
    },
    [logout, security, user],
  );
  const verifyCurrentPin = useCallback(
    (pin: string) => {
      if (!user) return Promise.resolve(false);
      return security.verifyPin(user.id, pin);
    },
    [security, user],
  );
  const unlockWithBiometrics = useCallback(async () => {
    if (!user || !biometric?.available || !biometricEnabled) return false;
    if (await security.unlockBiometric(user.id)) {
      await wait(220);
      setLocked(false);
      return true;
    }
    return false;
  }, [biometric, biometricEnabled, security, user]);
  const changePin = useCallback(
    (currentPin: string, nextPin: string) => {
      if (!user)
        return Promise.resolve({
          success: false,
          code: "noUser" as const,
          message: "Foydalanuvchi topilmadi",
        });
      return security.changePin(user.id, currentPin, nextPin);
    },
    [security, user],
  );
  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      if (!user)
        return {
          success: false,
          code: "noUser" as const,
          message: "Foydalanuvchi topilmadi",
        };
      if (!biometric?.available)
        return {
          success: false,
          code: "biometricUnavailable" as const,
          message: "Bu qurilmada biometrika mavjud emas",
        };
      if (enabled && !(await authenticate())) {
        return {
          success: false,
          code: "biometricCancelled" as const,
          message: "Biometrik tasdiqlash bekor qilindi",
        };
      }
      const record = await pinStorage.setBiometricEnabled(user.id, enabled);
      if (!record)
        return { success: false, code: "pinNotFound" as const, message: "PIN-kod topilmadi" };
      setBiometricEnabledState(enabled);
      return { success: true };
    },
    [authenticate, biometric, user],
  );
  const removePin = useCallback(async () => {
    if (!user)
      return {
        success: false,
        code: "noUser" as const,
        message: "Foydalanuvchi topilmadi",
      };
    await pinStorage.clearPin(user.id);
    await pinStorage.markPinSetupComplete(user.id);
    setBiometricEnabledState(false);
    setPinEnabled(false);
    setSetupRequired(false);
    setLocked(false);
    return { success: true };
  }, [user]);
  const resetPinAndLogout = useCallback(async () => {
    if (!user) return;
    await pinStorage.clearPin(user.id);
    await pinStorage.clearPinSetupState(user.id);
    await logout();
  }, [logout, user]);
  const gateResolving =
    isResolving || (!isBootstrapping && (user?.id ?? null) !== resolvedUserId);
  const value = useMemo<AppLockValue>(
    () => ({
      isResolving: gateResolving,
      setupRequired,
      pinEnabled,
      isLocked,
      biometric,
      biometricEnabled,
      displayName: user?.fullName ?? "Foydalanuvchi",
      submitSetupPin,
      submitUnlockPin,
      verifyCurrentPin,
      unlockWithBiometrics,
      changePin,
      setBiometricEnabled,
      removePin,
      resetPinAndLogout,
      startPinSetup: () => {
        setSetupRequired(true);
        setLocked(true);
      },
      lockNow: () => setLocked(true),
    }),
    [
      biometric,
      biometricEnabled,
      changePin,
      gateResolving,
      isLocked,
      pinEnabled,
      setupRequired,
      submitSetupPin,
      submitUnlockPin,
      verifyCurrentPin,
      setBiometricEnabled,
      removePin,
      resetPinAndLogout,
      unlockWithBiometrics,
      user?.fullName,
    ],
  );
  return (
    <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
  );
}
export function useAppLock() {
  const value = useContext(AppLockContext);
  if (!value) throw new Error("useAppLock must be used inside AppLockProvider");
  return value;
}
