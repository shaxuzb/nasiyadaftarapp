import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "react-native-nitro-google-signin";
import { GOOGLE_AUTH_CONFIG } from "../../../config/env";

let isConfigured = false;

function configureGoogleSignIn() {
  if (isConfigured) {
    return;
  }

  const webClientId = GOOGLE_AUTH_CONFIG.webClientId?.trim();
  const androidClientId = GOOGLE_AUTH_CONFIG.androidClientId?.trim();

  if (!webClientId) {
    throw new Error(
      "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID sozlanmagan. Google Cloud'dagi Web OAuth client ID kerak.",
    );
  }

  if (androidClientId && webClientId === androidClientId) {
    throw new Error(
      "Google Web client ID o'rniga Android client ID yozilgan. Google Cloud'da Web application turidagi OAuth client yarating.",
    );
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
    throw new Error(
      "Google kirish yakunlanmadi. Account tanlangandan keyin qaytsa Web client ID va Android signing SHA-1'ni tekshiring.",
    );
  }

  if (!isSuccessResponse(response)) {
    throw new Error("Google akkaunt tanlanmadi");
  }

  const idToken = response.data.idToken?.trim();
  if (!idToken) {
    throw new Error("Google ID token qaytarmadi");
  }

  return idToken;
}

export function getGoogleSignInErrorMessage(error: unknown): string {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return "Google Play Services mavjud emas yoki yangilanishi kerak";
      case statusCodes.DEVELOPER_ERROR:
        return "Google OAuth sozlamasi noto'g'ri: package nomi, SHA-1 va client ID'ni tekshiring";
      case statusCodes.IN_PROGRESS:
        return "Google orqali kirish jarayoni allaqachon ochilgan";
      case statusCodes.SIGN_IN_CANCELLED:
        return "Google orqali kirish bekor qilindi";
      default:
        break;
    }
  }

  return error instanceof Error
    ? error.message
    : "Google orqali kirishda kutilmagan xatolik";
}
