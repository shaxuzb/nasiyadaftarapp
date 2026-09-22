import {
  isValidPublicApiBaseUrl,
  resolveApiBaseUrl,
} from "./apiBaseUrl";

const configuredApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

// Despite the host name, nasiya-test-api.crmuz.uz IS the production backend;
// there is no separate staging deployment today. The two constants stay split
// so that introducing one later only means changing the development value.
// Both are also pinned per build profile in eas.json, so a release never
// depends on a .env file reaching the build machine.
const DEFAULT_DEVELOPMENT_API_BASE_URL = "https://nasiya-test-api.crmuz.uz/api";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://nasiya-test-api.crmuz.uz/api";

const fallbackApiBaseUrl = __DEV__
  ? DEFAULT_DEVELOPMENT_API_BASE_URL
  : DEFAULT_PRODUCTION_API_BASE_URL;

export const API_BASE_URL = resolveApiBaseUrl(
  configuredApiBaseUrl,
  fallbackApiBaseUrl,
  { requireHttps: !__DEV__ },
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
