import type { Locale } from "../../../i18n/types";

/**
 * The languages offered on first launch. Only those with a translation can be
 * chosen; the rest are listed, greyed out, as on their way, so a Kazakh or
 * Tajik speaker sees their language is coming rather than missing.
 */
export interface SetupLanguage {
  /** The app's locale, for a language that can be chosen. */
  locale: Locale | null;
  code: string;
  /** The language's name in itself. */
  nativeName: string;
  /** The country whose flag stands for it. */
  flag: string;
}

export const SETUP_LANGUAGES: readonly SetupLanguage[] = [
  { locale: "uz", code: "uz", nativeName: "O‘zbekcha", flag: "UZ" },
  { locale: "ru", code: "ru", nativeName: "Русский", flag: "RU" },
  { locale: null, code: "en", nativeName: "English", flag: "GB" },
  { locale: null, code: "kk", nativeName: "Қазақша", flag: "KZ" },
  { locale: null, code: "tg", nativeName: "Тоҷикӣ", flag: "TJ" },
  { locale: null, code: "ky", nativeName: "Кыргызча", flag: "KG" },
  { locale: null, code: "tr", nativeName: "Türkçe", flag: "TR" },
  { locale: null, code: "tk", nativeName: "Türkmençe", flag: "TM" },
];

/** The language the app is in now: its flag and name, for the profile. */
export function getSetupLanguage(locale: Locale): SetupLanguage {
  return SETUP_LANGUAGES.find((language) => language.locale === locale) ?? SETUP_LANGUAGES[0];
}

export type CurrencyCode =
  | "UZS" | "USD" | "EUR" | "RUB" | "KZT" | "KGS" | "TJS" | "TRY" | "AED" | "CNY";

export interface SetupCurrency {
  code: CurrencyCode;
  /** The country (or union) whose flag stands for it. */
  flag: string;
  symbol: string;
}

/** Uzbekistan first, then the dollar and euro, then the neighbours. */
export const SETUP_CURRENCIES: readonly SetupCurrency[] = [
  { code: "UZS", flag: "UZ", symbol: "so‘m" },
  { code: "USD", flag: "US", symbol: "$" },
  { code: "EUR", flag: "EU", symbol: "€" },
  { code: "RUB", flag: "RU", symbol: "₽" },
  { code: "KZT", flag: "KZ", symbol: "₸" },
  { code: "KGS", flag: "KG", symbol: "сом" },
  { code: "TJS", flag: "TJ", symbol: "SM" },
  { code: "TRY", flag: "TR", symbol: "₺" },
  { code: "AED", flag: "AE", symbol: "AED" },
  { code: "CNY", flag: "CN", symbol: "¥" },
];

export const DEFAULT_CURRENCY: CurrencyCode = "UZS";

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return SETUP_CURRENCIES.some((currency) => currency.code === value);
}

/** What first launch leaves behind. */
export interface AppSetup {
  completed: boolean;
  currency: CurrencyCode;
}

export const INITIAL_APP_SETUP: AppSetup = { completed: false, currency: DEFAULT_CURRENCY };

/** The stored setup, or the initial one for anything unreadable. */
export function parseAppSetup(raw: string | null): AppSetup {
  if (!raw) return INITIAL_APP_SETUP;
  try {
    const value = JSON.parse(raw) as Partial<AppSetup> | null;
    return {
      completed: value?.completed === true,
      currency: isCurrencyCode(value?.currency) ? value.currency : DEFAULT_CURRENCY,
    };
  } catch {
    return INITIAL_APP_SETUP;
  }
}

/** Options whose words contain the query; all of them for an empty one. */
export function filterByQuery<T>(
  items: readonly T[],
  query: string,
  words: (item: T) => string,
): readonly T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => words(item).toLowerCase().includes(needle));
}
