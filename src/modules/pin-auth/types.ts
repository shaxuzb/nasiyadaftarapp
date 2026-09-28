export interface PinRecord {
  version: 1;
  salt: string;
  digest: string;
  biometricEnabled: boolean;
  attempts: number;
  /** ISO deadline while entry is locked out, null while it is open. */
  lockedUntil: string | null;
  displayName: string;
  maskedContact: string | null;
}

export interface BiometricCapability {
  available: boolean;
  label: "Face ID" | "Touch ID" | "Barmoq izi";
  icon: "scan-outline" | "finger-print-outline";
}
