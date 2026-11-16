import type { Locale } from "../../../i18n/types";

/**
 * The languages offered on first launch and in the profile, each named in
 * itself. All are translated in full; `locale: null` would list one, greyed
 * out, as coming soon.
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
  { locale: "en", code: "en", nativeName: "English", flag: "GB" },
  { locale: "kk", code: "kk", nativeName: "Қазақша", flag: "KZ" },
  { locale: "tg", code: "tg", nativeName: "Тоҷикӣ", flag: "TJ" },
  { locale: "ky", code: "ky", nativeName: "Кыргызча", flag: "KG" },
  { locale: "tr", code: "tr", nativeName: "Türkçe", flag: "TR" },
  { locale: "tk", code: "tk", nativeName: "Türkmençe", flag: "TM" },
];

/** The language the app is in now: its flag and name, for the profile. */
export function getSetupLanguage(locale: Locale): SetupLanguage {
  return SETUP_LANGUAGES.find((language) => language.locale === locale) ?? SETUP_LANGUAGES[0];
}

/** What first launch leaves behind. */
export interface AppSetup {
  completed: boolean;
}

export const INITIAL_APP_SETUP: AppSetup = { completed: false };

/** The stored setup, or the initial one for anything unreadable. */
export function parseAppSetup(raw: string | null): AppSetup {
  if (!raw) return INITIAL_APP_SETUP;
  try {
    const value = JSON.parse(raw) as Partial<AppSetup> | null;
    return { completed: value?.completed === true };
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
