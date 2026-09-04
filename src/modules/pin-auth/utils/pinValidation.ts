export const PIN_LENGTH = 4;

const BLOCKED_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "0123",
  "1234",
  "2345",
  "3456",
  "4567",
  "5678",
  "6789",
  "9876",
  "8765",
  "7654",
  "6543",
  "5432",
  "4321",
  "3210",
]);

export type PinValidationResult =
  | { valid: true }
  | { valid: false; message: string };

export function validatePin(pin: string): PinValidationResult {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin)) {
    return {
      valid: false,
      message: "PIN 4 ta raqamdan iborat bo‘lishi kerak",
    };
  }

  if (BLOCKED_PINS.has(pin)) {
    return { valid: false, message: "Murakkabroq PIN-kod tanlang" };
  }

  return { valid: true };
}
