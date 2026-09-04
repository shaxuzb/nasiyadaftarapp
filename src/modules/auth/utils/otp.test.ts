// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { extractOtpCode } from "./otp.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  extractOtpCode(
    "Nasiya Daftar ilovaga ro'yxatdan o'tish uchun tasdiqlash kodi: 766416\nFA+9qCX9VSu",
  ) === "766416",
  "extracts the six-digit code from the Uzbek SMS format",
);

assert(
  extractOtpCode("Telefon raqam: +998 90 123 45 67") === null,
  "does not treat a phone number as an OTP",
);

assert(
  extractOtpCode("Tasdiqlash kodi: 12345") === null,
  "rejects a five-digit code",
);

assert(
  extractOtpCode("Tasdiqlash kodi: 1234567") === null,
  "rejects a seven-digit code",
);

console.log("OTP extraction tests passed");
