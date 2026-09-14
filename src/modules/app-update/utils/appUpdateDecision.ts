import type { AppVersionCheckResponse } from "../types/appUpdate.types";

export interface AppUpdateDecision {
  shouldShow: boolean;
  isForced: boolean;
}

export function getAppUpdateDecision(
  response: AppVersionCheckResponse,
  dismissedVersion: string | null,
): AppUpdateDecision {
  const isForced = response.updateRequired;
  const hasUpdate = response.updateAvailable || response.updateRequired;

  if (!hasUpdate) {
    return { shouldShow: false, isForced: false };
  }

  if (!isForced && dismissedVersion === response.latestVersion) {
    return { shouldShow: false, isForced: false };
  }

  return { shouldShow: true, isForced };
}
