export const APP_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

export function shouldLockAfterInactivity(
  inactiveSince: number | null,
  now: number,
  timeout = APP_INACTIVITY_TIMEOUT_MS,
): boolean {
  if (inactiveSince === null) return false;

  const elapsed = now - inactiveSince;

  // A negative span means the device clock moved backwards while the app was
  // in the background. Wall-clock arithmetic can be rewound past the timeout,
  // so treat that as tampering and lock instead of trusting the difference.
  if (elapsed < 0) return true;

  return elapsed >= timeout;
}
