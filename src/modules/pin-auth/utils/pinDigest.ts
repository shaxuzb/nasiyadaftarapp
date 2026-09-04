import * as Crypto from "expo-crypto";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createPinSalt(): Promise<string> {
  return bytesToHex(await Crypto.getRandomBytesAsync(16));
}

export function digestPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`,
  );
}
