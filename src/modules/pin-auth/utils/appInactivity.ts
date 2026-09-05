export const APP_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

export function shouldLockAfterInactivity(
  inactiveSince: number | null,
  now: number,
  timeout = APP_INACTIVITY_TIMEOUT_MS,
): boolean {
  return inactiveSince !== null && now - inactiveSince >= timeout;
}
