import { API_BASE_URL } from "../../../config/env";
import { APP_UPDATE_REQUEST_TIMEOUT_MS } from "../constants/appUpdate.constants";
import type {
  AppUpdatePlatform,
  AppVersionCheckResponse,
} from "../types/appUpdate.types";
import { parseAppVersionCheckResponse } from "../utils/appVersionResponse";

export function getAppUpdatePlatform(): AppUpdatePlatform | null {
  if (process.env.EXPO_OS === "android") return "android";
  if (process.env.EXPO_OS === "ios") return "ios";
  return null;
}

export async function fetchAppVersionCheck(
  platform: AppUpdatePlatform,
  currentVersion: string,
): Promise<AppVersionCheckResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    APP_UPDATE_REQUEST_TIMEOUT_MS,
  );

  try {
    const query =
      `platform=${encodeURIComponent(platform)}` +
      `&currentVersion=${encodeURIComponent(currentVersion)}`;
    const response = await fetch(`${API_BASE_URL}/app-versions/check?${query}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`App update request failed: HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    return parseAppVersionCheckResponse(payload, platform);
  } finally {
    clearTimeout(timeout);
  }
}
