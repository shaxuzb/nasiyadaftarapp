import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, PermissionsAndroid, Platform } from "react-native";
import {
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from "@react-native-firebase/messaging";
import { getOrCreateUniqueId } from "../../../services/authStorage";
import { registerPushDevice, unregisterPushDevice } from "./pushService";
import { getNotificationIdFromData } from "../utils/notificationPayload";
import {
  createPushDevicePayload,
  getPushPlatform,
  mapAndroidPermissionStatus,
  mapAuthorizationStatus,
  type PushPermissionState,
} from "./pushRegistrationUtils";
import type { PushDevicePayload } from "../types";

export type { PushPermissionState } from "./pushRegistrationUtils";

let lastRegisteredPayload: PushDevicePayload | null = null;
const PUSH_NOTIFICATIONS_ENABLED_KEY = "push_notifications_enabled_v1";

function getPushNotificationsEnabledKey(userId: number | string): string {
  return `${PUSH_NOTIFICATIONS_ENABLED_KEY}:${String(userId)}`;
}

export async function getPushNotificationsEnabled(
  userId: number | string,
): Promise<boolean> {
  const value = await AsyncStorage.getItem(getPushNotificationsEnabledKey(userId));
  return value !== "false";
}

export async function setPushNotificationsEnabled(
  userId: number | string,
  enabled: boolean,
): Promise<void> {
  await AsyncStorage.setItem(
    getPushNotificationsEnabledKey(userId),
    enabled ? "true" : "false",
  );
}

export async function getNotificationPermissionState(): Promise<PushPermissionState> {
  if (Platform.OS === "android") {
    if (Number(Platform.Version) < 33) return "granted";
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return granted ? "granted" : "undetermined";
  }

  const status = await hasPermission(getMessaging());
  return mapAuthorizationStatus(status);
}

export async function requestNotificationPermission(): Promise<PushPermissionState> {
  if (Platform.OS === "android") {
    if (Number(Platform.Version) < 33) return "granted";
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return mapAndroidPermissionStatus(status);
  }

  const status = await requestPermission(getMessaging(), {
    alert: true,
    badge: true,
    sound: true,
    provisional: false,
  });
  return mapAuthorizationStatus(status);
}

export async function registerPushToken(token: string): Promise<PushDevicePayload> {
  const installationId = await getOrCreateUniqueId();
  const payload = createPushDevicePayload({
    installationId,
    platform: getPushPlatform(Platform.OS === "ios" ? "ios" : "android"),
    token,
  });

  if (
    lastRegisteredPayload &&
    lastRegisteredPayload.installationId === payload.installationId &&
    lastRegisteredPayload.platform === payload.platform &&
    lastRegisteredPayload.token === payload.token
  ) {
    return payload;
  }

  await registerPushDevice(payload);
  lastRegisteredPayload = payload;
  return payload;
}

export async function registerCurrentPushDevice(): Promise<{
  permission: PushPermissionState;
  payload: PushDevicePayload | null;
}> {
  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    return { permission, payload: null };
  }

  const token = (await getToken(getMessaging())).trim();
  if (!token) throw new Error("Firebase token is empty");
  return { permission, payload: await registerPushToken(token) };
}

export function clearPushRegistrationCache() {
  lastRegisteredPayload = null;
}

export async function unregisterCurrentPushDevice(): Promise<void> {
  const installationId = await getOrCreateUniqueId();
  await unregisterPushDevice(installationId);
  clearPushRegistrationCache();
}

export async function openPushSystemSettings(): Promise<void> {
  await Linking.openSettings();
}
