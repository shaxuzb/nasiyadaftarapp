import { Locale } from "./types";

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
