import type { PinStorage } from "./pinStorageFactory";
import type { PinValidationResult } from "../utils/pinValidation";

export type PinCheckResult = {
  success: boolean;
  mustLogout: boolean;
  attemptsRemaining: number;
};

export type SecurityActionResult = {
  success: boolean;
  message?: string;
};

type Authenticate = () => Promise<boolean>;
const MAX_PIN_ATTEMPTS = 5;

function failedPinState(previousAttempts: number) {
  const attempts = Math.min(previousAttempts + 1, MAX_PIN_ATTEMPTS);
  return { attemptsRemaining: Math.max(MAX_PIN_ATTEMPTS - attempts, 0), mustLogout: attempts >= MAX_PIN_ATTEMPTS };
}

export function createPinSecurity(
  storage: PinStorage,
  validatePin: (pin: string) => PinValidationResult,
  authenticate: Authenticate,
) {
  async function checkPin(userId: number, pin: string): Promise<PinCheckResult> {
    const record = await storage.getPinRecord(userId);
    if (!record) return { success: false, mustLogout: false, attemptsRemaining: 0 };

    if (await storage.verifyPin(userId, pin)) {
      await storage.resetAttempts(userId);
      return { success: true, mustLogout: false, attemptsRemaining: 5 };
    }

    const state = failedPinState(record.attempts);
    await storage.incrementAttempts(userId);
    return {
      success: false,
      mustLogout: state.mustLogout,
      attemptsRemaining: state.attemptsRemaining,
    };
  }

  async function verifyPin(userId: number, pin: string): Promise<boolean> {
    return storage.verifyPin(userId, pin);
  }

  async function changePin(
    userId: number,
    currentPin: string,
    nextPin: string,
  ): Promise<SecurityActionResult> {
    const validation = validatePin(nextPin);
    if (!validation.valid) throw new Error(validation.message);
    if (!(await storage.verifyPin(userId, currentPin))) {
      return { success: false, message: "Amaldagi PIN-kod noto'g'ri" };
    }

    const record = await storage.getPinRecord(userId);
    if (!record) return { success: false, message: "PIN-kod topilmadi" };

    await storage.setPin({
      userId,
      pin: nextPin,
      displayName: record.displayName,
      maskedContact: record.maskedContact,
      biometricEnabled: record.biometricEnabled,
    });
    return { success: true };
  }

  async function setBiometric(
    userId: number,
    currentPin: string,
    enabled: boolean,
  ): Promise<SecurityActionResult> {
    if (!(await storage.verifyPin(userId, currentPin))) {
      return { success: false, message: "PIN-kod tasdiqlanmadi" };
    }
    if (enabled && !(await authenticate())) {
      return { success: false, message: "Biometrik tasdiqlash bekor qilindi" };
    }
    const record = await storage.setBiometricEnabled(userId, enabled);
    return record
      ? { success: true }
      : { success: false, message: "PIN-kod topilmadi" };
  }

  async function unlockBiometric(userId: number): Promise<boolean> {
    const record = await storage.getPinRecord(userId);
    if (!record?.biometricEnabled) return false;
    if (!(await authenticate())) return false;
    await storage.resetAttempts(userId);
    return true;
  }

  return { checkPin, verifyPin, changePin, setBiometric, unlockBiometric };
}
