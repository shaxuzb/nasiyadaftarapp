import { readFileSync } from "node:fs";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const screen = readFileSync("src/screens/NotificationsScreen.tsx", "utf8");
assert(screen.includes("usePushNotificationList"), "Inbox must use push list query");
assert(screen.includes("useMarkPushNotificationRead"), "Inbox must support read state");
assert(screen.includes("RefreshControl"), "Inbox must support pull to refresh");
assert(screen.includes("fetchNextPage"), "Inbox must support pagination");
assert(screen.includes("notifications.emptyTitle"), "Inbox must have empty state copy");
assert(screen.includes("notifications.loadError"), "Inbox must have error state copy");
assert(screen.includes("navigation.goBack"), "Inbox must support back navigation");
assert(screen.includes("highlightId"), "Inbox must support push highlight navigation");

console.log("Notifications screen contract passed");
