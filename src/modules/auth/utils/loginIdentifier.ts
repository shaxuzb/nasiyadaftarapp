import {
  formatUzPhoneFromDigits,
  isValidUzPhone,
  normalizeUzPhoneDigits,
  toStoredUzPhone,
} from "../../../utils/masks";

const PHONE_INPUT_PATTERN = /^[+\d][\d\s()-]*$/;

export function isPhoneLoginIdentifier(value: string): boolean {
  return value.trimStart().startsWith("+998");
}

export function formatLoginIdentifierInput(
  nextValue: string,
  currentValue: string,
): string {
  if (!nextValue) return "";

  const wasPhone = isPhoneLoginIdentifier(currentValue);
  const looksLikePhone = PHONE_INPUT_PATTERN.test(nextValue.trim());

  if (!wasPhone && !looksLikePhone) return nextValue;

  const localDigits = normalizeUzPhoneDigits(nextValue);
  const allDigits = nextValue.replace(/\D/g, "");

  if (wasPhone && localDigits.length === 0 && allDigits.length <= 3) {
    return "";
  }

  return formatUzPhoneFromDigits(nextValue);
}

export function isValidLoginIdentifier(value: string): boolean {
  if (isPhoneLoginIdentifier(value)) return isValidUzPhone(value);
  return value.trim().length > 2;
}

export function normalizeLoginIdentifier(value: string): string {
  if (isPhoneLoginIdentifier(value)) return toStoredUzPhone(value);
  return value.trim();
}
