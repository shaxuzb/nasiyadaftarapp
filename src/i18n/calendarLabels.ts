import { addDays, parseDateOnly, type DateOnly } from "../utils/dateOnly";
import type { Translate, TranslateKey } from "./translate";

// Month and weekday names come from the translation files rather than Intl:
// Hermes ships partial locale data, and uz-UZ month names can fall back to
// English on some Android builds.
export const MONTH_KEYS = [
  "calendar.months.jan",
  "calendar.months.feb",
  "calendar.months.mar",
  "calendar.months.apr",
  "calendar.months.may",
  "calendar.months.jun",
  "calendar.months.jul",
  "calendar.months.aug",
  "calendar.months.sep",
  "calendar.months.oct",
  "calendar.months.nov",
  "calendar.months.dec",
] as const satisfies readonly TranslateKey[];

export const MONTH_SHORT_KEYS = [
  "calendar.monthsShort.jan",
  "calendar.monthsShort.feb",
  "calendar.monthsShort.mar",
  "calendar.monthsShort.apr",
  "calendar.monthsShort.may",
  "calendar.monthsShort.jun",
  "calendar.monthsShort.jul",
  "calendar.monthsShort.aug",
  "calendar.monthsShort.sep",
  "calendar.monthsShort.oct",
  "calendar.monthsShort.nov",
  "calendar.monthsShort.dec",
] as const satisfies readonly TranslateKey[];

/** Monday first, matching buildMonthGrid. */
export const WEEKDAY_KEYS = [
  "calendar.weekdays.mon",
  "calendar.weekdays.tue",
  "calendar.weekdays.wed",
  "calendar.weekdays.thu",
  "calendar.weekdays.fri",
  "calendar.weekdays.sat",
  "calendar.weekdays.sun",
] as const satisfies readonly TranslateKey[];

/** "12 mar 2026", or the empty string for a value that is not a real day. */
export function formatDateOnly(value: DateOnly, t: Translate): string {
  const date = parseDateOnly(value);
  if (!date) return "";
  return `${date.getDate()} ${t(MONTH_SHORT_KEYS[date.getMonth()])} ${date.getFullYear()}`;
}

/**
 * The short label for a picked day: "Bugun" and "Kecha" read faster than a
 * date for the two choices people make most, anything older shows the date.
 */
export function formatRelativeDateOnly(
  value: DateOnly,
  today: DateOnly,
  t: Translate,
): string {
  if (value === today) return t("calendar.today");
  if (value === addDays(today, -1)) return t("calendar.yesterday");
  return formatDateOnly(value, t);
}
