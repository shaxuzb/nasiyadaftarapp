import type { Mask } from "react-native-mask-input";

export const uzPhoneMask: Mask = [
  "+",
  "9",
  "9",
  "8",
  " ",
  /\d/,
  /\d/,
  " ",
  /\d/,
  /\d/,
  /\d/,
  " ",
  /\d/,
  /\d/,
  " ",
  /\d/,
  /\d/,
];

/**
 * The nine digits after +998, from whatever was typed, pasted or stored:
 *
 *   "+998 93 998 70 55", "998939987055", "93 998 70 55", "(93) 998-70-55"
 *     -> "939987055"
 *
 * Phone fields always show their own "+998 ", so a number pasted into one
 * arrives with it in front: "+998 +998 93 998 70 55", "+998 998939987055".
 * Taking off only the first 998 turned those into "+998 99 893 99 87". Here
 * the field's prefix comes off first, then any whole international number
 * pasted after it.
 *
 * 998 is removed only from twelve digits or more, a full number with its
 * country code. Nine digits are always a local number, even one that starts
 * with 998 itself ("99 812 34 56").
 */
export function normalizeUzPhoneDigits(input: string): string {
  const compact = input.replace(/\s/g, "");
  // Backspacing into the field's "+998" ("+99", "+9", "+") leaves no number.
  if ("+998".startsWith(compact)) return "";
  let digits = (compact.startsWith("+998") ? compact.slice(4) : compact).replace(/\D/g, "");

  while (digits.length >= 12 && digits.startsWith("998")) digits = digits.slice(3);
  // A trunk zero some write before the operator: "0 93 998 70 55".
  if (digits.startsWith("0")) digits = digits.slice(1);

  return digits.slice(0, 9);
}

export function formatUzPhoneFromDigits(input: string): string {
  const digits = normalizeUzPhoneDigits(input);

  if (!digits) return "+998 ";
  if (digits.length <= 2) return `+998 ${digits}`;
  if (digits.length <= 5)
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 7) {
    return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }
  return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
}

export function isValidUzPhone(input: string): boolean {
  return normalizeUzPhoneDigits(input).length === 9;
}

export function toStoredUzPhone(input: string): string {
  return `+998${normalizeUzPhoneDigits(input)}`;
}

export function isOptionalUzPhoneValid(input: string): boolean {
  const digits = normalizeUzPhoneDigits(input);
  return digits.length === 0 || digits.length === 9;
}

export function toOptionalStoredUzPhone(input: string): string {
  return normalizeUzPhoneDigits(input) ? toStoredUzPhone(input) : "";
}

export function maskUzPhoneForDisplay(input: string): string {
  const digits = normalizeUzPhoneDigits(input);
  if (digits.length !== 9) return input;

  return `+998 ** *** ** ${digits.slice(-2)}`;
}
