export const APP_VERSION_CONFIG_URL =
  "https://raw.githubusercontent.com/shaxuzb/nasiyadaftarapp/main/app-version.json";

export const APP_UPDATE_REQUEST_TIMEOUT_MS = 8_000;
export const APP_UPDATE_CHECK_INTERVAL_MS = 15 * 60 * 1_000;
export const DISMISSED_UPDATE_VERSION_KEY = "dismissed_update_version_v1";

export const APP_UPDATE_COPY = {
  requiredBadge: "Majburiy yangilanish",
  optionalBadge: "Yangi versiya",
  currentVersion: "Joriy versiya",
  latestVersion: "Yangi versiya",
  androidUpdateAction: "Yangilash",
  iosUpdateAction: "App Store’da yangilash",
  laterAction: "Keyinroq",
  storeOpenError: "Ilovalar do‘konini ochib bo‘lmadi. Keyinroq urinib ko‘ring.",
} as const;
