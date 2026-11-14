import countryNames from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";
import ru from "i18n-iso-countries/langs/ru.json";
import uz from "i18n-iso-countries/langs/uz.json";
import kk from "i18n-iso-countries/langs/kk.json";
import ky from "i18n-iso-countries/langs/ky.json";
import tg from "i18n-iso-countries/langs/tg.json";
import tk from "i18n-iso-countries/langs/tk.json";
import tr from "i18n-iso-countries/langs/tr.json";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";

import type { Locale } from "../../../i18n/types";
import { flagOf } from "../utils/phoneNumber";
import { localeTag } from "../../../i18n/formatters";

// The app's languages (English also for searching, "Uzbekistan").
for (const names of [en, ru, uz, kk, ky, tg, tk, tr]) countryNames.registerLocale(names);

export interface PhoneCountry {
  code: CountryCode;
  name: string;
  /** "+998" */
  callingCode: string;
  flag: string;
  /** Lower-cased name, English name, code and calling code, for searching. */
  searchText: string;
}

/** Shown first, before the rest in alphabetical order: where most of the
 * app's customers and their customers are. */
export const POPULAR_PHONE_COUNTRIES: readonly CountryCode[] = [
  "UZ", "RU", "KZ", "KG", "TJ", "TM", "TR", "US",
];

const cache = new Map<Locale, readonly PhoneCountry[]>();

export function getCountryName(code: CountryCode, locale: Locale): string {
  return countryNames.getName(code, locale) ?? countryNames.getName(code, "en") ?? code;
}

/**
 * Every country with a calling code, named in `locale`: the popular ones
 * first, then the rest alphabetically. Built once per language.
 */
export function getPhoneCountries(locale: Locale): readonly PhoneCountry[] {
  const cached = cache.get(locale);
  if (cached) return cached;

  const all = getCountries().map((code): PhoneCountry => {
    const name = getCountryName(code, locale);
    const callingCode = `+${getCountryCallingCode(code)}`;
    const englishName = countryNames.getName(code, "en") ?? "";
    return {
      code,
      name,
      callingCode,
      flag: flagOf(code),
      searchText: `${name} ${englishName} ${code} ${callingCode} ${callingCode.slice(1)}`.toLowerCase(),
    };
  });
  const collator = new Intl.Collator(localeTag(locale));
  const popular = POPULAR_PHONE_COUNTRIES.map((code) => all.find((country) => country.code === code))
    .filter((country): country is PhoneCountry => Boolean(country));
  const rest = all
    .filter((country) => !POPULAR_PHONE_COUNTRIES.includes(country.code))
    .sort((left, right) => collator.compare(left.name, right.name));

  const list = [...popular, ...rest];
  cache.set(locale, list);
  return list;
}

/** Countries whose name, code or calling code contains the query. */
export function searchPhoneCountries(
  countries: readonly PhoneCountry[],
  query: string,
): readonly PhoneCountry[] {
  const needle = query.trim().toLowerCase().replace(/^\+/, "");
  if (!needle) return countries;
  return countries.filter((country) => country.searchText.includes(needle));
}
