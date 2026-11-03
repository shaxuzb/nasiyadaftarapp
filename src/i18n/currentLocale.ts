import { DEFAULT_LOCALE, type Locale } from "./types";

/**
 * The language the app is in, for code outside React: the requests that tell
 * the server which language to answer in. LanguageProvider keeps it current.
 */
let currentLocale: Locale = DEFAULT_LOCALE;

export function getCurrentLocale(): Locale {
  return currentLocale;
}

export function setCurrentLocale(locale: Locale): void {
  currentLocale = locale;
}
