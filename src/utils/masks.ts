import { Mask, createNumberMask } from "react-native-mask-input";

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

export const amountMask: Mask = createNumberMask({
  delimiter: " ",
  precision: 0,
  separator: ".",
});

export function normalizeUzPhoneDigits(input: string): string {
  const digits = input.replace(/\D/g, "");

  if (digits.startsWith("998")) return digits.slice(3, 12);
  if (digits.startsWith("0")) return digits.slice(1, 10);

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

export function maskUzPhoneForDisplay(input: string): string {
  const digits = normalizeUzPhoneDigits(input);
  if (digits.length !== 9) return input;

  return `+998 ** *** ** ${digits.slice(-2)}`;
}
