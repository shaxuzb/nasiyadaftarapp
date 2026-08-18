interface ParsedSemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

const SEMANTIC_VERSION_PATTERN =
  /^[vV]?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function parseSemanticVersion(version: string): ParsedSemanticVersion | null {
  const match = SEMANTIC_VERSION_PATTERN.exec(version.trim());
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

export function isValidSemanticVersion(version: unknown): version is string {
  return typeof version === "string" && parseSemanticVersion(version) !== null;
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

export function compareSemanticVersions(left: string, right: string): number {
  const parsedLeft = parseSemanticVersion(left);
  const parsedRight = parseSemanticVersion(right);

  if (!parsedLeft || !parsedRight) {
    throw new Error("Invalid semantic version");
  }

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

export interface UpdateAvailability {
  hasUpdate: boolean;
  isForced: boolean;
}

export function evaluateUpdateAvailability(
  currentVersion: string,
  latestVersion: string,
  minimumVersion: string,
  forceUpdate: boolean,
): UpdateAvailability {
  const hasUpdate = compareSemanticVersions(currentVersion, latestVersion) < 0;

  return {
    hasUpdate,
    isForced:
      hasUpdate &&
      (forceUpdate ||
        compareSemanticVersions(currentVersion, minimumVersion) < 0),
  };
}
