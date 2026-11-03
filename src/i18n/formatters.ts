import type { Locale } from "./types";

const LOCALE_TAGS: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
};

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: Locale): Intl.NumberFormat {
  const tag = LOCALE_TAGS[locale];
  const cached = numberFormatters.get(tag);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(tag);
  numberFormatters.set(tag, formatter);
  return formatter;
}

function getDateFormatter(locale: Locale): Intl.DateTimeFormat {
  const tag = LOCALE_TAGS[locale];
  const cached = dateFormatters.get(tag);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat(tag, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  dateFormatters.set(tag, formatter);
  return formatter;
}

export function formatLocalizedNumber(value: number, locale: Locale): string {
  return getNumberFormatter(locale).format(value);
}

export function formatLocalizedCurrency(
  value: number,
  locale: Locale,
): string {
  return `${formatLocalizedNumber(value, locale)} ${locale === "ru" ? "сум" : "so‘m"}`;
}

export function formatLocalizedDisplayedBalance(
  amount: number,
  locale: Locale,
): string {
  const value = -(Number.isFinite(amount) ? amount : 0);
  if (value > 0) return `+${formatLocalizedCurrency(value, locale)}`;
  if (value < 0) return `-${formatLocalizedCurrency(Math.abs(value), locale)}`;
  return formatLocalizedCurrency(0, locale);
}

export function formatLocalizedDate(
  value: string | number | Date,
  locale: Locale,
): string {
  const date = value instanceof Date ? value : new Date(value);
  return getDateFormatter(locale).format(date);
}

const pad2 = (value: number) => String(value).padStart(2, "0");

// "2026-10-21", "2026-10-21T15:07:00", "2026-10-21 15:07", with or without
// seconds, fraction or zone after.
const SERVER_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

/**
 * A moment as "31-okt, 2026, 15:07": the date as formatLocalizedDate writes
 * it, then the time.
 *
 * The time is the one the server wrote, read off the text and shown as it
 * is: no time zone is worked out or added. A value with no time (a date the
 * user picked, say) shows the date alone, never a made-up "00:00". A Date or
 * a timestamp is the phone's own moment and shows the phone's clock.
 */
export function formatLocalizedDateTime(
  value: string | number | Date,
  locale: Locale,
): string {
  if (typeof value !== "string") {
    const date = value instanceof Date ? value : new Date(value);
    return `${getDateFormatter(locale).format(date)}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }
  const match = SERVER_DATE_TIME.exec(value.trim());
  // Some other shape: the date, as everywhere before.
  if (!match) return formatLocalizedDate(value, locale);
  const [, year, month, day, hours, minutes] = match;
  const datePart = getDateFormatter(locale).format(
    new Date(Number(year), Number(month) - 1, Number(day)),
  );
  return hours === undefined ? datePart : `${datePart}, ${hours}:${minutes}`;
}
