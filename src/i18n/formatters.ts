import type { Locale } from "./types";

/**
 * The Intl locale behind each language, for digit grouping and dates. A tag
 * the phone's Intl does not know falls back by itself.
 */
const LOCALE_TAGS: Record<Locale, string> = {
  uz: "uz-UZ",
  ru: "ru-RU",
  en: "en-US",
  kk: "kk-KZ",
  tg: "tg-TJ",
  ky: "ky-KG",
  tr: "tr-TR",
  tk: "tk-TM",
};

export function localeTag(locale: Locale): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS.uz;
}

/** The sum's unit word after an amount, by language. */
const SUM_LABELS: Record<Locale, string> = {
  uz: "so‘m",
  ru: "сум",
  en: "UZS",
  kk: "сум",
  tg: "сум",
  ky: "сум",
  tr: "som",
  tk: "som",
};

const numberFormatters = new Map<string, Intl.NumberFormat>();
const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function getNumberFormatter(locale: Locale): Intl.NumberFormat {
  const tag = localeTag(locale);
  const cached = numberFormatters.get(tag);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(tag);
  numberFormatters.set(tag, formatter);
  return formatter;
}

function getDateFormatter(locale: Locale): Intl.DateTimeFormat {
  const tag = localeTag(locale);
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

/** The currency every amount is in unless told otherwise (plans and SMS packages always are). */
export const BASE_CURRENCY_CODE = "UZS";

/**
 * The sign written after an amount, by currency code: those GET /currencies
 * lists, kept here so amounts read right offline and before it answers.
 * A code the server adds later shows its own symbol once that list has come
 * (registerCurrencySymbols), and its code until then.
 */
const currencySymbols = new Map<string, string>([
  ["USD", "$"],
  ["EUR", "€"],
  ["RUB", "₽"],
  ["KZT", "₸"],
  ["KGS", "сом"],
  ["TJS", "SM"],
  ["TMT", "m"],
  ["AZN", "₼"],
  ["BYN", "Br"],
  ["AMD", "֏"],
]);

export function registerCurrencySymbols(currencies: readonly { code: string; symbol: string }[]): void {
  for (const currency of currencies) {
    if (currency.code !== BASE_CURRENCY_CODE && currency.symbol.trim()) {
      currencySymbols.set(currency.code, currency.symbol.trim());
    }
  }
}

/** "so‘m" (Russian "сум") for the sum, the symbol for any other currency. */
export function currencyLabel(currencyCode: string, locale: Locale): string {
  if (currencyCode === BASE_CURRENCY_CODE) return SUM_LABELS[locale] ?? SUM_LABELS.uz;
  return currencySymbols.get(currencyCode) ?? currencyCode;
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

// Cents where there are any ("120,50"), none where there are not ("120").
function getMoneyFormatter(locale: Locale): Intl.NumberFormat {
  const tag = localeTag(locale);
  const cached = moneyFormatters.get(tag);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat(tag, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  moneyFormatters.set(tag, formatter);
  return formatter;
}

/**
 * An amount with its currency after it: "250 000 so‘m", "120,50 $". The
 * organization's currency for debts and payments; the sum, by default, for
 * plans and SMS packages, which are always paid in it.
 */
export function formatLocalizedCurrency(
  value: number,
  locale: Locale,
  currencyCode: string = BASE_CURRENCY_CODE,
): string {
  return `${getMoneyFormatter(locale).format(value)} ${currencyLabel(currencyCode, locale)}`;
}

export function formatLocalizedDisplayedBalance(
  amount: number,
  locale: Locale,
  currencyCode: string = BASE_CURRENCY_CODE,
): string {
  const value = -(Number.isFinite(amount) ? amount : 0);
  if (value > 0) return `+${formatLocalizedCurrency(value, locale, currencyCode)}`;
  if (value < 0) return `-${formatLocalizedCurrency(Math.abs(value), locale, currencyCode)}`;
  return formatLocalizedCurrency(0, locale, currencyCode);
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
