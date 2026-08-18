import {
  APP_UPDATE_REQUEST_TIMEOUT_MS,
  APP_VERSION_CONFIG_URL,
} from "../constants/appUpdate.constants";
import {
  AppUpdatePlatform,
  AppVersionConfig,
  PlatformUpdateConfig,
} from "../types/appUpdate.types";
import {
  compareSemanticVersions,
  isValidSemanticVersion,
} from "../utils/compareVersions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidStoreUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePlatformUpdateConfig(
  value: unknown,
): PlatformUpdateConfig | null {
  if (!isRecord(value)) return null;

  const {
    latestVersion,
    minimumVersion,
    forceUpdate,
    title,
    message,
    storeUrl,
  } = value;

  if (
    !isValidSemanticVersion(latestVersion) ||
    !isValidSemanticVersion(minimumVersion) ||
    typeof forceUpdate !== "boolean" ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(message) ||
    !isValidStoreUrl(storeUrl) ||
    compareSemanticVersions(latestVersion, minimumVersion) < 0
  ) {
    return null;
  }

  return {
    latestVersion: latestVersion.trim(),
    minimumVersion: minimumVersion.trim(),
    forceUpdate,
    title: title.trim(),
    message: message.trim(),
    storeUrl: storeUrl.trim(),
  };
}

export function validateAppVersionConfig(
  value: unknown,
): AppVersionConfig | null {
  if (!isRecord(value)) return null;

  const android = validatePlatformUpdateConfig(value.android);
  const ios = validatePlatformUpdateConfig(value.ios);
  if (!android || !ios) return null;

  return { android, ios };
}

export function getAppUpdatePlatform(): AppUpdatePlatform | null {
  if (process.env.EXPO_OS === "android") return "android";
  if (process.env.EXPO_OS === "ios") return "ios";
  return null;
}

export async function fetchPlatformUpdateConfig(
  platform: AppUpdatePlatform,
): Promise<PlatformUpdateConfig | null> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    APP_UPDATE_REQUEST_TIMEOUT_MS,
  );

  try {
    const separator = APP_VERSION_CONFIG_URL.includes("?") ? "&" : "?";
    const response = await fetch(
      `${APP_VERSION_CONFIG_URL}${separator}t=${Date.now()}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`App update request failed: HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) return null;
    return validatePlatformUpdateConfig(payload[platform]);
  } finally {
    clearTimeout(timeout);
  }
}
