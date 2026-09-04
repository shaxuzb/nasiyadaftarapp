import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getBiometricCapability, authenticateWithBiometrics } from "../services/biometricAuth";
import { pinStorage } from "../services/pinStorage";
import type { BiometricCapability } from "../types";
import { recordFailedPinAttempt } from "../utils/appLockState";

type UnlockResult = { status: "unlocked" | "invalid" | "logged-out"; attemptsRemaining: number };
interface AppLockValue { isResolving: boolean; setupRequired: boolean; isLocked: boolean; biometric: BiometricCapability | null; displayName: string; submitSetupPin(pin: string): Promise<void>; submitUnlockPin(pin: string): Promise<UnlockResult>; unlockWithBiometrics(): Promise<boolean>; lockNow(): void; }
const AppLockContext = createContext<AppLockValue | undefined>(undefined);
function maskedContact(phone?: string | null, email?: string | null) { if (phone) return phone.replace(/(\+\d{3}\s?\d{2})\d+(\d{2})$/, "$1 *** ** $2"); return email ?? null; }

export function AppLockProvider({ children }: { children: ReactNode }) {
  const { user, isBootstrapping, logout } = useAuth();
  const [isResolving, setResolving] = useState(true); const [resolvedUserId, setResolvedUserId] = useState<number | null>(null); const [setupRequired, setSetupRequired] = useState(false); const [isLocked, setLocked] = useState(false); const [biometric, setBiometric] = useState<BiometricCapability | null>(null); const userIdRef = useRef<number | null>(null);
  useEffect(() => { let active = true; const load = async () => { if (isBootstrapping) return; setResolving(true); userIdRef.current = user?.id ?? null; if (!user) { if (active) { setSetupRequired(false); setLocked(false); setBiometric(null); setResolvedUserId(null); setResolving(false); } return; } const [hasPin, capability] = await Promise.all([pinStorage.hasPin(user.id), getBiometricCapability().catch(() => null)]); if (!active || userIdRef.current !== user.id) return; await pinStorage.updateDisplayMetadata(user.id, user.fullName, maskedContact(user.phoneNumber, user.email)); if (active) { setSetupRequired(!hasPin); setLocked(hasPin); setBiometric(capability); setResolvedUserId(user.id); setResolving(false); } }; void load(); return () => { active = false; }; }, [isBootstrapping, user]);
  const submitSetupPin = useCallback(async (pin: string) => { if (!user) throw new Error("Foydalanuvchi topilmadi"); await pinStorage.setPin({ userId:user.id, pin, displayName:user.fullName, maskedContact:maskedContact(user.phoneNumber,user.email) }); setSetupRequired(false); setLocked(false); }, [user]);
  const submitUnlockPin = useCallback(async (pin: string): Promise<UnlockResult> => { if (!user) return { status:"invalid", attemptsRemaining:0 }; if (await pinStorage.verifyPin(user.id,pin)) { await pinStorage.resetAttempts(user.id); setLocked(false); return {status:"unlocked",attemptsRemaining:5}; } const record = await pinStorage.incrementAttempts(user.id); const state = recordFailedPinAttempt(Math.max((record?.attempts ?? 1) - 1, 0)); if (state.mustLogout) { await logout(); return {status:"logged-out",attemptsRemaining:0}; } return {status:"invalid",attemptsRemaining:state.attemptsRemaining}; }, [logout,user]);
  const unlockWithBiometrics = useCallback(async () => { if (!user || !biometric?.available) return false; if (await authenticateWithBiometrics()) { await pinStorage.resetAttempts(user.id); setLocked(false); return true; } return false; }, [biometric,user]);
  const gateResolving = isResolving || (!isBootstrapping && (user?.id ?? null) !== resolvedUserId);
  const value = useMemo<AppLockValue>(() => ({ isResolving: gateResolving, setupRequired, isLocked, biometric, displayName:user?.fullName ?? "Foydalanuvchi", submitSetupPin, submitUnlockPin, unlockWithBiometrics, lockNow: () => setLocked(true) }), [biometric,gateResolving,isLocked,setupRequired,submitSetupPin,submitUnlockPin,unlockWithBiometrics,user?.fullName]);
  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
}
export function useAppLock() { const value = useContext(AppLockContext); if (!value) throw new Error("useAppLock must be used inside AppLockProvider"); return value; }
