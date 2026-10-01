import type { PinStorage } from "./pinStorageFactory";
import type { PinValidationResult } from "../utils/pinValidation";
import type { PinErrorCode } from "../utils/pinErrors";
/**
 * Supplied by the caller rather than imported, so this module stays free of
 * runtime imports and a test can control the clock. See
 * `defaultPinLockoutPolicy` in ../utils/pinLockout.
 */
export interface PinLockoutPolicy {
  maxAttempts: number;
  getLockoutDurationMs(attempts: number): number | null;
  getAttemptsRemaining(attempts: number): number;
  isLockoutActive(lockedUntilMs: number | null, now: number): boolean;
  parseLockedUntil(value: string | null | undefined): number | null;
  now(): number;
}

export type PinCheckResult = {
  success: boolean;
  attemptsRemaining: number;
  /** Epoch milliseconds until entry reopens, or null while it is open. */
  lockedUntilMs: number | null;
};

export type SecurityActionResult = {
  success: boolean;
  message?: string;
  code?: PinErrorCode;
};

type Authenticate = () => Promise<boolean>;

export function createPinSecurity(
  storage: PinStorage,
  validatePin: (pin: string) => PinValidationResult,
  authenticate: Authenticate,
  lockout: PinLockoutPolicy,
) {
  async function checkPin(userId: number, pin: string): Promise<PinCheckResult> {
    const record = await storage.getPinRecord(userId);
    if (!record) {
      return { success: false, attemptsRemaining: 0, lockedUntilMs: null };
    }

    const currentTime = lockout.now();
    const storedLock = lockout.parseLockedUntil(record.lockedUntil);

    // While a lockout is running the PIN is rejected without spending an
    // attempt, so guesses made during the wait cannot push the ladder higher.
    if (lockout.isLockoutActive(storedLock, currentTime)) {
      return {
        success: false,
        attemptsRemaining: 0,
        lockedUntilMs: storedLock,
      };
    }

    if (await storage.verifyPin(userId, pin)) {
      await storage.resetAttempts(userId);
      return {
        success: true,
        attemptsRemaining: lockout.maxAttempts,
        lockedUntilMs: null,
      };
    }

    const updated = await storage.incrementAttempts(userId);
    const attempts = updated?.attempts ?? record.attempts + 1;
    const lockoutMs = lockout.getLockoutDurationMs(attempts);

    if (lockoutMs === null) {
      return {
        success: false,
        attemptsRemaining: lockout.getAttemptsRemaining(attempts),
        lockedUntilMs: null,
      };
    }

    const lockedUntilMs = currentTime + lockoutMs;
    await storage.setLockedUntil(
      userId,
      new Date(lockedUntilMs).toISOString(),
    );
    return { success: false, attemptsRemaining: 0, lockedUntilMs };
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
      return {
        success: false,
        code: "currentPinInvalid",
        message: "Amaldagi PIN-kod noto'g'ri",
      };
    }

    const record = await storage.getPinRecord(userId);
    if (!record)
      return {
        success: false,
        code: "pinNotFound",
        message: "PIN-kod topilmadi",
      };

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
      return {
        success: false,
        code: "pinNotVerified",
        message: "PIN-kod tasdiqlanmadi",
      };
    }
    if (enabled && !(await authenticate())) {
      return {
        success: false,
        code: "biometricCancelled",
        message: "Biometrik tasdiqlash bekor qilindi",
      };
    }
    const record = await storage.setBiometricEnabled(userId, enabled);
    return record
      ? { success: true }
      : { success: false, code: "pinNotFound", message: "PIN-kod topilmadi" };
  }

  async function unlockBiometric(userId: number): Promise<boolean> {
    const record = await storage.getPinRecord(userId);
    if (!record?.biometricEnabled) return false;
    if (!(await authenticate())) return false;
    // Deliberately available during a PIN lockout. The lockout exists to stop
    // someone guessing a 4-digit PIN, which a fingerprint or face cannot be
    // guessed into; the OS rate-limits biometric attempts on its own. Blocking
    // it here would only strand the owner. Succeeding clears the lockout.
    await storage.resetAttempts(userId);
    return true;
  }

  return { checkPin, verifyPin, changePin, setBiometric, unlockBiometric };
}
