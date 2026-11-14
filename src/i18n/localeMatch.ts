import type { Locale } from "./types";

const SUPPORTED: readonly Locale[] = ["uz", "ru", "en", "kk", "tg", "ky", "tr", "tk"];

/**
 * The first of the phone's languages ("kk-KZ", "uz-Cyrl-UZ", "en_US") the
 * app is translated into; null when none is. Only the language part counts.
 */
export function matchSupportedLocale(tags: readonly (string | null | undefined)[]): Locale | null {
  for (const tag of tags) {
    if (typeof tag !== "string") continue;
    const language = tag.trim().toLowerCase().split(/[-_]/)[0];
    const match = SUPPORTED.find((locale) => locale === language);
    if (match) return match;
  }
  return null;
}
