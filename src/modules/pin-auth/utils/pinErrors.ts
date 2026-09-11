import type { Translate, TranslateKey } from "../../../i18n";

export type PinErrorCode =
  | "noUser"
  | "pinNotFound"
  | "pinNotVerified"
  | "currentPinInvalid"
  | "biometricCancelled"
  | "biometricUnavailable";

const PIN_ERROR_KEYS: Record<PinErrorCode, TranslateKey> = {
  noUser: "security.noUser",
  pinNotFound: "security.pinNotFound",
  pinNotVerified: "security.pinNotVerified",
  currentPinInvalid: "security.currentPinInvalid",
  biometricCancelled: "security.biometricCancelled",
  biometricUnavailable: "security.biometricUnavailable",
};

export function translatePinError(
  t: Translate,
  code: PinErrorCode | undefined,
  fallback: TranslateKey,
) {
  return t(code ? PIN_ERROR_KEYS[code] : fallback);
}
