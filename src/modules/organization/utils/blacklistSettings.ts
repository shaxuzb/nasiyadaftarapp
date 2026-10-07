
// The server rejects anything outside this range with a 400.
export const MIN_BLACKLIST_DAYS = 30;
export const MAX_BLACKLIST_DAYS = 3650;

export function parseBlacklistDays(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const value = Number(input);
  return Number.isInteger(value) &&
    value >= MIN_BLACKLIST_DAYS &&
    value <= MAX_BLACKLIST_DAYS
    ? value
    : null;
}
