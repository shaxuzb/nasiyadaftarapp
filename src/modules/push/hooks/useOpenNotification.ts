import { useCallback } from "react";

import { navigateToPushNotification } from "../../../navigation/navigationRef";
import { openNotificationLink } from "../services/notificationNavigation";
import { useMarkPushNotificationRead } from "./usePushQueries";

export interface NotificationTarget {
  notificationId: number | null;
  link: string | null;
}

/**
 * What a tap on a push does, whether it was the system notification or the
 * in-app banner: follow its link, or open the inbox when it has none.
 */
export function useOpenNotification() {
  const { mutate: markRead } = useMarkPushNotificationRead();

  return useCallback(
    async ({ notificationId, link }: NotificationTarget) => {
      if (await openNotificationLink(link)) {
        // Going where it pointed is acting on it, so it stops counting as
        // unread. The inbox does the same when a row is tapped.
        if (notificationId !== null) markRead(notificationId);
        return;
      }
      navigateToPushNotification(notificationId);
    },
    [markRead],
  );
}
