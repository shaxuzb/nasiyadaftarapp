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
import {
  getBiometricCapability,
  authenticateWithBiometrics,
} from "../services/biometricAuth";
import { pinStorage } from "../services/pinStorage";
import { createPinSecurity } from "../services/pinSecurity";
import type { BiometricCapability } from "../types";
import { validatePin } from "../utils/pinValidation";

type UnlockResult = {
  status: "unlocked" | "invalid" | "logged-out";
  attemptsRemaining: number;
};
interface AppLockValue {
  isResolving: boolean;
  setupRequired: boolean;
  isLocked: boolean;
  biometric: BiometricCapability | null;
  biometricEnabled: boolean;
  displayName: string;
  submitSetupPin(pin: string): Promise<void>;
  submitUnlockPin(pin: string): Promise<UnlockResult>;
  unlockWithBiometrics(): Promise<boolean>;
  changePin(currentPin: string, nextPin: string): Promise<{ success: boolean; message?: string }>;
  setBiometricEnabled(enabled: boolean): Promise<{ success: boolean; message?: string }>;
  lockNow(): void;
}
const AppLockContext = createContext<AppLockValue | undefined>(undefined);
function maskedContact(phone?: string | null, email?: string | null) {
  if (phone)
    return phone.replace(/(\+\d{3}\s?\d{2})\d+(\d{2})$/, "$1 *** ** $2");
  return email ?? null;
}
const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, isBootstrapping, logout } = useAuth();
  const [isResolving, setResolving] = useState(true);
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);
  const [isLocked, setLocked] = useState(false);
  const [biometric, setBiometric] = useState<BiometricCapability | null>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const userIdRef = useRef<number | null>(null);
  const security = useMemo(
    () => createPinSecurity(pinStorage, validatePin, authenticateWithBiometrics),
    [],
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
          setLocked(false);
          setBiometric(null);
          setBiometricEnabledState(false);
          setResolvedUserId(null);
          setResolving(false);
        }
        return;
      }
      const [record, capability] = await Promise.all([
        pinStorage.getPinRecord(user.id),
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
        setSetupRequired(!hasPin);
        setLocked(hasPin);
        setBiometric(capability);
        setBiometricEnabled(updatedRecord?.biometricEnabled ?? record?.biometricEnabled ?? false);
        setResolvedUserId(user.id);
        setResolving(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [isBootstrapping, user]);
  const submitSetupPin = useCallback(
    async (pin: string) => {
      if (!user) throw new Error("Foydalanuvchi topilmadi");
      const validation = validatePin(pin);
      if (!validation.valid) throw new Error(validation.message);
      await pinStorage.setPin({
        userId: user.id,
        pin,
        displayName: user.fullName,
        maskedContact: maskedContact(user.phoneNumber, user.email),
      });
      setSetupRequired(false);
      setLocked(false);
      setBiometricEnabledState(false);
    },
    [user],
  );
  const submitUnlockPin = useCallback(
    async (pin: string): Promise<UnlockResult> => {
      if (!user) return { status: "invalid", attemptsRemaining: 0 };
      const result = await security.checkPin(user.id, pin);
      if (result.success) {
        await wait(220);
        setLocked(false);
        return { status: "unlocked", attemptsRemaining: result.attemptsRemaining };
      }
      if (result.mustLogout) {
        await logout();
        return { status: "logged-out", attemptsRemaining: 0 };
      }
      return { status: "invalid", attemptsRemaining: result.attemptsRemaining };
    },
    [logout, security, user],
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
      if (!user) return Promise.resolve({ success: false, message: "Foydalanuvchi topilmadi" });
      return security.changePin(user.id, currentPin, nextPin);
    },
    [security, user],
  );
  const setBiometricEnabled = useCallback(
    async (enabled: boolean) => {
      if (!user) return { success: false, message: "Foydalanuvchi topilmadi" };
      if (!biometric?.available) return { success: false, message: "Bu qurilmada biometrika mavjud emas" };
      if (enabled && !(await authenticateWithBiometrics())) {
        return { success: false, message: "Biometrik tasdiqlash bekor qilindi" };
      }
      const record = await pinStorage.setBiometricEnabled(user.id, enabled);
      if (!record) return { success: false, message: "Avval PIN-kod o'rnating" };
      setBiometricEnabledState(enabled);
      return { success: true };
    },
    [biometric, user],
  );
  const gateResolving =
    isResolving || (!isBootstrapping && (user?.id ?? null) !== resolvedUserId);
  const value = useMemo<AppLockValue>(
    () => ({
      isResolving: gateResolving,
      setupRequired,
      isLocked,
      biometric,
      biometricEnabled,
      displayName: user?.fullName ?? "Foydalanuvchi",
      submitSetupPin,
      submitUnlockPin,
      unlockWithBiometrics,
      changePin,
      setBiometricEnabled,
      lockNow: () => setLocked(true),
    }),
    [
      biometric,
      biometricEnabled,
      changePin,
      gateResolving,
      isLocked,
      setupRequired,
      submitSetupPin,
      submitUnlockPin,
      setBiometricEnabled,
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
