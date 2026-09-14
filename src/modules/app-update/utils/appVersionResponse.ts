import type {
  AppUpdatePlatform,
  AppVersionCheckResponse,
} from "../types/appUpdate.types";

interface ParsedSemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

const SEMANTIC_VERSION_PATTERN =
  /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseSemanticVersion(value: string): ParsedSemanticVersion | null {
  const match = SEMANTIC_VERSION_PATTERN.exec(value.trim());
  if (!match) return null;

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (![major, minor, patch].every(Number.isSafeInteger)) return null;

  return {
    major,
    minor,
    patch,
    prerelease: match[4]?.split(".") ?? [],
  };
}

function isSemanticVersion(value: unknown): value is string {
  return typeof value === "string" && parseSemanticVersion(value) !== null;
}

function comparePrereleaseIdentifiers(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);
    if (leftNumeric && rightNumeric) {
      const difference = Number(leftPart) - Number(rightPart);
      if (difference !== 0) return difference > 0 ? 1 : -1;
      continue;
    }
    if (leftNumeric) return -1;
    if (rightNumeric) return 1;
    return leftPart > rightPart ? 1 : -1;
  }

  return 0;
}

function compareSemanticVersions(left: string, right: string): number {
  const parsedLeft = parseSemanticVersion(left);
  const parsedRight = parseSemanticVersion(right);
  if (!parsedLeft || !parsedRight) return 0;

  const leftCore = [parsedLeft.major, parsedLeft.minor, parsedLeft.patch];
  const rightCore = [parsedRight.major, parsedRight.minor, parsedRight.patch];

  for (let index = 0; index < leftCore.length; index += 1) {
    if (leftCore[index] === rightCore[index]) continue;
    return leftCore[index] > rightCore[index] ? 1 : -1;
  }

  return comparePrereleaseIdentifiers(
    parsedLeft.prerelease,
    parsedRight.prerelease,
  );
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    !isSemanticVersion(currentVersion) ||
    !isSemanticVersion(latestVersion) ||
    !isSemanticVersion(minimumVersion) ||
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
