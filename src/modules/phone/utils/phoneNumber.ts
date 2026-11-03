import {
  AsYouType,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type { CountryCode };

/** Where a number is assumed to be from when nothing says otherwise. */
export const DEFAULT_PHONE_COUNTRY: CountryCode = "UZ";

/**
 * A phone number as a field holds it: the country chosen beside the field and
 * the national digits typed after its fixed calling code.
 */
export interface PhoneValue {
  country: CountryCode;
  /** National digits only, without the calling code: "939987055". */
  digits: string;
}

/** E.164 allows fifteen digits in all, the calling code included. */
const MAX_E164_DIGITS = 15;

export function emptyPhone(country: CountryCode = DEFAULT_PHONE_COUNTRY): PhoneValue {
  return { country, digits: "" };
}

/** "+998" for UZ. */
export function callingCodeOf(country: CountryCode): string {
  return `+${getCountryCallingCode(country)}`;
}

/** 🇺🇿 for UZ: the two regional-indicator letters of the country code. */
export function flagOf(country: string): string {
  return String.fromCodePoint(
    ...country.toUpperCase().split("").map((letter) => 0x1f1a5 + letter.charCodeAt(0)),
  );
}

/**
 * The national digits for `country` in whatever was typed or pasted:
 *
 *   "+998 93 998 70 55"  -> UZ  939987055   (a whole number: its country wins)
 *   "+1 202 555 0123"    -> US  2025550123
 *   "998939987055"       -> UZ  939987055   (the calling code without "+")
 *   "93 998 70 55"       -> UZ  939987055
 *   "0 93 998 70 55"     -> UZ  939987055   (a trunk zero)
 *
 * The calling code comes off digits that start with it only when the rest is
 * a valid number and the whole is not, so a local number that happens to
 * start with it ("99 812 34 56" in UZ) is kept as it is.
 */
export function readPhoneInput(text: string, country: CountryCode): PhoneValue {
  const compact = text.replace(/[\s()\-.]/g, "");
  const international = compact.startsWith("+")
    ? compact
    : compact.startsWith("00")
      ? `+${compact.slice(2)}`
      : null;

  if (international) {
    const parsed = parsePhoneNumberFromString(international);
    if (parsed?.country) {
      return { country: parsed.country, digits: limit(parsed.nationalNumber, parsed.country) };
    }
    // A "+" with a partial or unknown number: keep its digits in this field.
    return { country, digits: limit(stripCallingCode(international.replace(/\D/g, ""), country), country) };
  }

  let digits = stripCallingCode(compact.replace(/\D/g, ""), country);
  // A trunk zero some write before the number ("0 93 998 70 55"), which
  // Uzbekistan's numbering plan does not list as its own: dropped when the
  // rest is the valid number and the whole is not.
  if (
    digits.startsWith("0") &&
    !isValidPhoneNumber(digits, country) &&
    isValidPhoneNumber(digits.slice(1), country)
  ) {
    digits = digits.slice(1);
  }
  // A country's own national prefix: drop it when what is left is the valid
  // number.
  const national = parsePhoneNumberFromString(digits, country);
  if (national?.isValid() && national.nationalNumber !== digits) {
    digits = national.nationalNumber;
  }
  return { country, digits: limit(digits, country) };
}

function stripCallingCode(digits: string, country: CountryCode): string {
  const code = getCountryCallingCode(country);
  if (
    digits.startsWith(code) &&
    digits.length > code.length &&
    !isValidPhoneNumber(digits, country) &&
    isValidPhoneNumber(`+${digits}`, country)
  ) {
    return digits.slice(code.length);
  }
  return digits;
}

function limit(digits: string, country: CountryCode): string {
  return digits.slice(0, MAX_E164_DIGITS - getCountryCallingCode(country).length);
}

/** The national digits formatted as they are typed: "93 998 70 55". */
export function formatNational(value: PhoneValue): string {
  if (!value.digits) return "";
  return new AsYouType(value.country).input(value.digits);
}

export function isPhoneEmpty(value: PhoneValue): boolean {
  return value.digits.length === 0;
}

export function isPhoneValid(value: PhoneValue): boolean {
  return value.digits.length > 0 && isValidPhoneNumber(value.digits, value.country);
}

/** Empty, or a whole valid number: what an optional phone field accepts. */
export function isOptionalPhoneValid(value: PhoneValue): boolean {
  return isPhoneEmpty(value) || isPhoneValid(value);
}

/** "+998939987055", or "" for an empty field. */
export function toE164(value: PhoneValue): string {
  return value.digits ? `${callingCodeOf(value.country)}${value.digits}` : "";
}

/**
 * A stored number back into a field: "+998939987055", or an older one saved
 * without the "+" ("998939987055") or without the code ("939987055"), which
 * were always Uzbek.
 */
export function phoneFromStored(
  stored: string | null | undefined,
  fallback: CountryCode = DEFAULT_PHONE_COUNTRY,
): PhoneValue {
  const text = stored?.trim() ?? "";
  if (!text) return emptyPhone(fallback);
  return readPhoneInput(text, text.startsWith("+") ? fallback : DEFAULT_PHONE_COUNTRY);
}

/** The country a stored number belongs to, if it can be told. */
export function countryOfStored(stored: string | null | undefined): CountryCode | null {
  const text = stored?.trim() ?? "";
  if (!text) return null;
  return parsePhoneNumberFromString(text.startsWith("+") ? text : `+${text}`)?.country ?? null;
}

/** "+998 93 998 70 55" for display; the text as it is when it cannot be read. */
export function formatPhoneForDisplay(stored: string): string {
  const parsed = parsePhoneNumberFromString(stored.startsWith("+") ? stored : `+${stored}`);
  return parsed?.isValid() ? parsed.formatInternational() : stored;
}

/** "+998 ** *** ** 55": the number's last two digits, for a screen that only
 * confirms where a code went. */
export function maskPhoneForDisplay(stored: string): string {
  const parsed = parsePhoneNumberFromString(stored.startsWith("+") ? stored : `+${stored}`);
  if (!parsed?.isValid()) return stored;
  const national = parsed.formatNational();
  let seen = 0;
  const totalDigits = national.replace(/\D/g, "").length;
  const masked = national.replace(/\d/g, (digit) => {
    seen += 1;
    return seen > totalDigits - 2 ? digit : "*";
  });
  return `+${parsed.countryCallingCode} ${masked}`;
}
