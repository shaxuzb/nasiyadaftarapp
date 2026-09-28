export const MAX_PIN_ATTEMPTS = 5;

// The fifth wrong PIN locks entry for 30 seconds, and every wrong PIN after
// that waits longer. A 4-digit PIN has 10,000 combinations, so an attacker
// holding the device would need days to work through them at this rate, while
// someone who simply mistyped waits half a minute once.
const LOCKOUT_LADDER_MS = [30_000, 60_000, 5 * 60_000, 15 * 60_000] as const;

export const MAX_LOCKOUT_MS = LOCKOUT_LADDER_MS[LOCKOUT_LADDER_MS.length - 1];

/**
 * How long entry is blocked after `attempts` consecutive failures, or null
 * while the user still has attempts left.
 */
export function getLockoutDurationMs(attempts: number): number | null {
  if (!Number.isFinite(attempts) || attempts < MAX_PIN_ATTEMPTS) return null;

  const step = Math.min(
    Math.floor(attempts) - MAX_PIN_ATTEMPTS,
    LOCKOUT_LADDER_MS.length - 1,
  );
  return LOCKOUT_LADDER_MS[step];
}

/** Attempts left before the next lockout, floored at zero. */
export function getAttemptsRemaining(attempts: number): number {
  if (!Number.isFinite(attempts) || attempts < 0) return MAX_PIN_ATTEMPTS;
  return Math.max(MAX_PIN_ATTEMPTS - Math.floor(attempts), 0);
}

/**
 * Milliseconds still to wait, or 0 when entry is open again.
 *
 * The deadline is wall-clock, so moving the device clock backwards would
 * otherwise strand the user for as long as the clock was rewound. Clamping to
 * the longest rung keeps a wrong clock from locking anyone out indefinitely.
 * Moving the clock forward can still end a lock early; defeating that needs a
 * trusted time source, which the device does not offer offline.
 */
export function getRemainingLockoutMs(
  lockedUntilMs: number | null,
  now: number,
): number {
  if (lockedUntilMs === null || !Number.isFinite(lockedUntilMs)) return 0;

  const remaining = lockedUntilMs - now;
  if (remaining <= 0) return 0;

  return Math.min(remaining, MAX_LOCKOUT_MS);
}

/** Reads a stored ISO deadline, treating anything unparseable as no lock. */
export function parseLockedUntil(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isLockoutActive(
  lockedUntilMs: number | null,
  now: number,
): boolean {
  return getRemainingLockoutMs(lockedUntilMs, now) > 0;
}

/** Renders a countdown as m:ss, so 30 seconds reads as 0:30. */
export function formatLockoutCountdown(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * The lockout rules as one injectable object.
 *
 * pinSecurity.ts and pinStorageFactory.ts deliberately carry no runtime
 * imports, so the standalone Node tests can load them directly from TypeScript.
 * Passing the policy in keeps that property while leaving the arithmetic here,
 * where it is tested on its own and where a test can swap the clock.
 */
export const defaultPinLockoutPolicy = {
  maxAttempts: MAX_PIN_ATTEMPTS,
  getLockoutDurationMs,
  getAttemptsRemaining,
  isLockoutActive,
  parseLockedUntil,
  now: () => Date.now(),
};

/** Whole seconds to show in a countdown, always at least 1 while locked. */
export function getLockoutSeconds(
  lockedUntilMs: number | null,
  now: number,
): number {
  const remaining = getRemainingLockoutMs(lockedUntilMs, now);
  return remaining === 0 ? 0 : Math.max(1, Math.ceil(remaining / 1000));
}
