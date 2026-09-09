export const DEFAULT_BLACKLIST_AFTER_DAYS = 30;

export function parseBlacklistDays(input: string): number | null {
  if (!/^\d+$/.test(input.trim())) return null;
  const value = Number(input);
  return Number.isInteger(value) && value >= 1 && value <= 3650 ? value : null;
}
