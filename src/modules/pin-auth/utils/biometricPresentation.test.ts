// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { BIOMETRIC_TYPE_FACE, BIOMETRIC_TYPE_FINGERPRINT, deriveBiometricCapability } from "./biometricPresentation.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

assert(
  deriveBiometricCapability("ios", [BIOMETRIC_TYPE_FACE], true).label ===
    "Face ID",
  "iOS facial recognition must be labelled Face ID",
);
assert(
  deriveBiometricCapability("ios", [BIOMETRIC_TYPE_FINGERPRINT], true).label ===
    "Touch ID",
  "iOS fingerprint must be labelled Touch ID",
);
assert(
  deriveBiometricCapability("android", [BIOMETRIC_TYPE_FINGERPRINT], true)
    .label === "Barmoq izi",
  "Android fingerprint must not claim Face ID",
);
assert(
  !deriveBiometricCapability("android", [], false).available,
  "Unavailable hardware must not expose biometric action",
);

console.log("biometric presentation regression tests passed");
