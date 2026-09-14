import {
  isValidPublicApiBaseUrl,
  resolveApiBaseUrl,
} from "./apiBaseUrl";

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const DEFAULT_DEVELOPMENT_API_BASE_URL = "https://nasiya-test-api.crmuz.uz/api";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://nasiya-test-api.crmuz.uz/api";

const fallbackApiBaseUrl = __DEV__
  ? DEFAULT_DEVELOPMENT_API_BASE_URL
  : DEFAULT_PRODUCTION_API_BASE_URL;

export const API_BASE_URL = resolveApiBaseUrl(
  configuredApiBaseUrl,
  fallbackApiBaseUrl,
);

export function assertPublicRuntimeConfig(): void {
  if (
    configuredApiBaseUrl &&
    !isValidPublicApiBaseUrl(configuredApiBaseUrl) &&
    __DEV__
  ) {
    throw new Error("EXPO_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL");
  }
}

assertPublicRuntimeConfig();

export const GOOGLE_AUTH_CONFIG = {
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};
