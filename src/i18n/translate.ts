import {
  DEFAULT_LOCALE,
  DeepKeys,
  Locale,
  TranslateParams,
  TranslationTree,
} from "./types";
import { enTranslations } from "./translations/en";
import { kkTranslations } from "./translations/kk";
import { kyTranslations } from "./translations/ky";
import { ruTranslations } from "./translations/ru";
import { tgTranslations } from "./translations/tg";
import { tkTranslations } from "./translations/tk";
import { trTranslations } from "./translations/tr";
import { uzTranslations } from "./translations/uz";

export type TranslateKey = DeepKeys<typeof uzTranslations>;
export type Translate = (
  key: TranslateKey,
  params?: TranslateParams,
) => string;

/** Every language, complete: each file is typed against the Uzbek one, so none can miss a key. */
const DICTIONARIES: Readonly<Record<Locale, TranslationTree>> = {
  uz: uzTranslations,
  ru: ruTranslations,
  en: enTranslations,
  kk: kkTranslations,
  tg: tgTranslations,
  ky: kyTranslations,
  tr: trTranslations,
  tk: tkTranslations,
};

export const SUPPORTED_LOCALES = Object.keys(DICTIONARIES) as readonly Locale[];

export function isSupportedLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.includes(value as Locale)
  );
}

function getValue(dictionary: TranslationTree, key: string): string | undefined {
  const value = key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[part];
  }, dictionary);

  return typeof value === "string" ? value : undefined;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;

  return template.replace(/\{([\w.]+)\}/g, (token, name: string) => {
    const value = params[name];
    return value === null || value === undefined ? token : String(value);
  });
}

export function createTranslator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale] ?? uzTranslations;

  return (key, params) => {
    const value =
      getValue(dictionary, key) ??
      getValue(uzTranslations, key) ??
      (typeof __DEV__ !== "undefined" && __DEV__
        ? `[missing:${key}]`
        : key);

    return interpolate(value, params);
  };
}

export { DEFAULT_LOCALE };
