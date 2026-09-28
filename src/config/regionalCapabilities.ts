export const IOS_REGIONAL_COMMERCE_COUNTRIES = [
  "UZ",
  "KZ",
  "KG",
  "TJ",
  "TM",
  "RU",
  "TR",
] as const;

export type RegionalCommerceCountry =
  (typeof IOS_REGIONAL_COMMERCE_COUNTRIES)[number];

export interface RegionalProductCapabilities {
  countryCode: string | null;
  source: "timezone" | "locale" | "unknown" | "non-ios";
  subscriptionVisible: boolean;
  paymentHistoryVisible: boolean;
  clientSmsVisible: boolean;
  upgradePromptsVisible: boolean;
}

const SUPPORTED_COUNTRIES = new Set<string>(IOS_REGIONAL_COMMERCE_COUNTRIES);

const SUPPORTED_TIMEZONE_COUNTRY: Record<string, RegionalCommerceCountry> = {
  "Asia/Tashkent": "UZ",
  "Asia/Samarkand": "UZ",

  "Asia/Almaty": "KZ",
  "Asia/Aqtobe": "KZ",
  "Asia/Aqtau": "KZ",
  "Asia/Atyrau": "KZ",
  "Asia/Oral": "KZ",
  "Asia/Qostanay": "KZ",
  "Asia/Qyzylorda": "KZ",

  "Asia/Bishkek": "KG",
  "Asia/Dushanbe": "TJ",
  "Asia/Ashgabat": "TM",

  "Europe/Istanbul": "TR",
  "Turkey": "TR",

  "Europe/Kaliningrad": "RU",
  "Europe/Moscow": "RU",
  "Europe/Samara": "RU",
  "Europe/Volgograd": "RU",
  "Asia/Yekaterinburg": "RU",
  "Asia/Omsk": "RU",
  "Asia/Novosibirsk": "RU",
  "Asia/Barnaul": "RU",
  "Asia/Tomsk": "RU",
  "Asia/Krasnoyarsk": "RU",
  "Asia/Irkutsk": "RU",
  "Asia/Chita": "RU",
  "Asia/Yakutsk": "RU",
  "Asia/Khandyga": "RU",
  "Asia/Vladivostok": "RU",
  "Asia/Ust-Nera": "RU",
  "Asia/Magadan": "RU",
  "Asia/Sakhalin": "RU",
  "Asia/Srednekolymsk": "RU",
  "Asia/Kamchatka": "RU",
  "Asia/Anadyr": "RU",
};

function normalizeCountryCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

export function getCountryCodeFromLocale(locale?: string | null) {
  if (!locale) return null;

  const normalized = locale.replace(/_/g, "-");
  const parts = normalized.split("-").filter(Boolean);

  for (let index = 1; index < parts.length; index += 1) {
    const country = normalizeCountryCode(parts[index]);
    if (country) return country;
  }

  return null;
}

export function getSupportedCountryFromTimeZone(timeZone?: string | null) {
  if (!timeZone) return null;
  return SUPPORTED_TIMEZONE_COUNTRY[timeZone.trim()] ?? null;
}

export function resolveRegionalProductCapabilities(input: {
  platform: string;
  locale?: string | null;
  timeZone?: string | null;
}): RegionalProductCapabilities {
  if (input.platform !== "ios") {
    return {
      countryCode: getCountryCodeFromLocale(input.locale),
      source: "non-ios",
      subscriptionVisible: true,
      paymentHistoryVisible: true,
      clientSmsVisible: true,
      upgradePromptsVisible: true,
    };
  }

  const timeZone = input.timeZone?.trim() || null;
  const timezoneCountry = getSupportedCountryFromTimeZone(timeZone);
  const localeCountry = getCountryCodeFromLocale(input.locale);

  // A concrete device timezone is the stronger runtime signal. If it points
  // outside the supported region, do not let a saved UI language/locale
  // accidentally opt the device back into regional commerce.
  const hasConcreteTimeZone =
    Boolean(timeZone) &&
    timeZone !== "UTC" &&
    timeZone !== "Etc/UTC" &&
    timeZone !== "GMT";

  const countryCode = timezoneCountry ?? localeCountry;
  const supported = hasConcreteTimeZone
    ? Boolean(timezoneCountry)
    : Boolean(localeCountry && SUPPORTED_COUNTRIES.has(localeCountry));

  return {
    countryCode,
    source: timezoneCountry ? "timezone" : localeCountry ? "locale" : "unknown",
    subscriptionVisible: supported,
    paymentHistoryVisible: supported,
    clientSmsVisible: supported,
    upgradePromptsVisible: supported,
  };
}
