import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "react-native-nitro-google-signin";
import { GOOGLE_AUTH_CONFIG } from "../../../config/env";
import type { TranslateKey } from "../../../i18n";

let isConfigured = false;

type GoogleSignInReason =
  | "configMissing"
  | "wrongClient"
  | "cancelled"
  | "accountNotSelected"
  | "tokenMissing";

class GoogleSignInFlowError extends Error {
  readonly reason: GoogleSignInReason;

  constructor(reason: GoogleSignInReason) {
    super(reason);
    this.name = "GoogleSignInFlowError";
    this.reason = reason;
  }
}

function configureGoogleSignIn() {
  if (isConfigured) {
    return;
  }

  const webClientId = GOOGLE_AUTH_CONFIG.webClientId?.trim();
  const androidClientId = GOOGLE_AUTH_CONFIG.androidClientId?.trim();

  if (!webClientId) {
    throw new GoogleSignInFlowError("configMissing");
  }

  if (androidClientId && webClientId === androidClientId) {
    throw new GoogleSignInFlowError("wrongClient");
  }

  GoogleOneTapSignIn.configure({
    webClientId,
    iosClientId: GOOGLE_AUTH_CONFIG.iosClientId?.trim() || undefined,
    offlineAccess: false,
    autoSelectOnSignIn: false,
  });

  isConfigured = true;
}

export async function requestGoogleIdToken(): Promise<string> {
  configureGoogleSignIn();

  await GoogleOneTapSignIn.checkPlayServices(true);
  const response = await GoogleOneTapSignIn.presentExplicitSignIn();

  if (isCancelledResponse(response)) {
    throw new GoogleSignInFlowError("cancelled");
  }

  if (!isSuccessResponse(response)) {
    throw new GoogleSignInFlowError("accountNotSelected");
  }

  const idToken = response.data.idToken?.trim();
  if (!idToken) {
    throw new GoogleSignInFlowError("tokenMissing");
  }

  return idToken;
}export function getGoogleSignInErrorKey(error: unknown): TranslateKey {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return "auth.googleErrors.playServices";
      case statusCodes.DEVELOPER_ERROR:
        return "auth.googleErrors.developer";
      case statusCodes.IN_PROGRESS:
        return "auth.googleErrors.inProgress";
      case statusCodes.SIGN_IN_CANCELLED:
        return "auth.googleErrors.cancelled";
      default:
        break;
    }
  }

  if (error instanceof GoogleSignInFlowError) {
    return `auth.googleErrors.${error.reason}` as TranslateKey;
  }

  return "auth.googleErrors.unexpected";
}