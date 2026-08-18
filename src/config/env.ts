export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:5024";

export const GOOGLE_AUTH_CONFIG = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
