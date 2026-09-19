import {
  createNavigationContainerRef,
} from "@react-navigation/native";
import type { RootStackParamList } from "../types";

export const navigationRef =
  createNavigationContainerRef<RootStackParamList>();

let hasPendingPushNavigation = false;
let pendingPushNotificationId: number | null = null;

export function navigateToPushNotification(notificationId: number | null) {
  if (!navigationRef.isReady()) {
    hasPendingPushNavigation = true;
    pendingPushNotificationId = notificationId;
    return;
  }

  navigationRef.navigate(
    "Notifications",
    notificationId === null ? undefined : { highlightId: notificationId },
  );
}

export function consumePendingPushNavigation() {
  if (!hasPendingPushNavigation) return undefined;
  hasPendingPushNavigation = false;
  const notificationId = pendingPushNotificationId;
  pendingPushNotificationId = null;
  return notificationId;
}
