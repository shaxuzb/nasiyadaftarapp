import type { PushDevicePayload, PushPlatform } from "../types";

export type PushPermissionState = "granted" | "denied" | "undetermined";

export function mapAuthorizationStatus(status: number): PushPermissionState {
  if (status === 1 || status === 2 || status === 3) return "granted";
  if (status === 0) return "denied";
  return "undetermined";
}

export function mapAndroidPermissionStatus(
  status: string,
): PushPermissionState {
  return status === "granted" ? "granted" : "denied";
}

export function getPushPlatform(os: "android" | "ios"): PushPlatform {
  return os;
}

export function createPushDevicePayload(input: {
  installationId: string;
  platform: PushPlatform;
  token: string;
}): PushDevicePayload {
  const installationId = input.installationId.trim();
  const token = input.token.trim();
  if (!installationId) throw new Error("Installation ID is required");
  if (!token) throw new Error("FCM token is required");
  return {
    installationId,
    platform: input.platform,
    token,
  };
}
