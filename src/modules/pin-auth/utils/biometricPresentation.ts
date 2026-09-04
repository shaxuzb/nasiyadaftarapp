import type { BiometricCapability } from "../types";

export const BIOMETRIC_TYPE_FINGERPRINT = 1;
export const BIOMETRIC_TYPE_FACE = 2;

const unavailable: BiometricCapability = {
  available: false,
  label: "Barmoq izi",
  icon: "finger-print-outline",
};

export function deriveBiometricCapability(
  platform: string,
  types: number[],
  available: boolean,
): BiometricCapability {
  if (!available) return unavailable;

  if (platform === "ios" && types.includes(BIOMETRIC_TYPE_FACE)) {
    return { available: true, label: "Face ID", icon: "scan-outline" };
  }

  if (platform === "ios") {
    return { available: true, label: "Touch ID", icon: "finger-print-outline" };
  }

  return { available: true, label: "Barmoq izi", icon: "finger-print-outline" };
}
