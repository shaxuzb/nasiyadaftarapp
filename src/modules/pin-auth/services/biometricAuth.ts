import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

import type { BiometricCapability } from "../types";
import {
  deriveBiometricCapability,
} from "../utils/biometricPresentation";

export async function getBiometricCapability(): Promise<BiometricCapability> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  const types = hasHardware && isEnrolled
    ? await LocalAuthentication.supportedAuthenticationTypesAsync()
    : [];

  return deriveBiometricCapability(
    Platform.OS,
    types,
    hasHardware && isEnrolled && types.length > 0,
  );
}

export async function authenticateWithBiometrics(
  promptMessage = "Qarz Daftar ilovasini oching",
  promptDescription = "Hisobingizni biometrika bilan tasdiqlang",
): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    promptDescription,
    biometricsSecurityLevel: "strong",
    disableDeviceFallback: true,
    fallbackLabel: "",
  });
  return result.success;
}
