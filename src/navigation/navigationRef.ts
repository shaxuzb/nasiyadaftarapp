import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
} from "@react-navigation/native";
import type { InternalRoute } from "../modules/push/utils/notificationLink";
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

/**
 * Goes to a screen a notification link named. Returns false, without moving,
 * when the app is not on its main screens yet or the screen is not offered
 * here — some are left out by region or plan — so the caller can do something
 * else instead of sending the user nowhere.
 */
export function navigateToInternalRoute(route: InternalRoute): boolean {
  if (!navigationRef.isReady()) return false;

  const state = navigationRef.getRootState();
  if (!state.routeNames.includes(route.screen)) return false;

  if (route.screen === "MainTabs") {
    // Known only once the tabs have rendered; before that the tab is assumed
    // to exist, which is true for every tab that is not conditional.
    const tabNames = state.routes.find((item) => item.name === "MainTabs")
      ?.state?.routeNames;
    if (tabNames && !tabNames.includes(route.tab)) return false;
    // popTo, not navigate: from a screen stacked above the tabs (the inbox,
    // where most links are tapped) navigate would push a second copy of the
    // tabs. popTo goes back to the one that is there and switches its tab.
    navigationRef.dispatch(
      StackActions.popTo("MainTabs", { screen: route.tab }),
    );
    return true;
  }

  navigationRef.dispatch(
    CommonActions.navigate({ name: route.screen, params: route.params }),
  );
  return true;
}

export function consumePendingPushNavigation() {
  if (!hasPendingPushNavigation) return undefined;
  hasPendingPushNavigation = false;
  const notificationId = pendingPushNotificationId;
  pendingPushNotificationId = null;
  return notificationId;
}
