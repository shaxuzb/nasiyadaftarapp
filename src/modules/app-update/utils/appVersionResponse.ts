import type {
  AppUpdatePlatform,
  AppVersionCheckResponse,
} from "../types/appUpdate.types";
import {
  compareSemanticVersions,
  isValidSemanticVersion,
} from "./compareVersions";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function parseAppVersionCheckResponse(
  value: unknown,
  expectedPlatform: AppUpdatePlatform,
): AppVersionCheckResponse | null {
  if (!isRecord(value) || value.platform !== expectedPlatform) return null;

  const {
    currentVersion,
    latestVersion,
    minimumVersion,
    updateAvailable,
    updateRequired,
    forceUpdate,
    title,
    message,
    storeUrl,
  } = value;

  if (
    !isValidSemanticVersion(currentVersion) ||
    !isValidSemanticVersion(latestVersion) ||
    !isValidSemanticVersion(minimumVersion) ||
    typeof updateAvailable !== "boolean" ||
    typeof updateRequired !== "boolean" ||
    typeof forceUpdate !== "boolean" ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(message) ||
    !isHttpsUrl(storeUrl) ||
    compareSemanticVersions(latestVersion, minimumVersion) < 0
  ) {
    return null;
  }

  return {
    platform: expectedPlatform,
    currentVersion: currentVersion.trim(),
    latestVersion: latestVersion.trim(),
    minimumVersion: minimumVersion.trim(),
    updateAvailable,
    updateRequired,
    forceUpdate,
    title: title.trim(),
    message: message.trim(),
    storeUrl: storeUrl.trim(),
  };
}
