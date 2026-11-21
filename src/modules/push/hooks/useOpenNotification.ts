import { useCallback } from "react";

import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useTranslation } from "../../../i18n";
import {
  deferInternalRoute,
  navigateToPushNotification,
} from "../../../navigation/navigationRef";
import { openNotificationLink } from "../services/notificationNavigation";
import {
  getRouteOrganizationId,
  matchInternalRoute,
  parseNotificationLink,
} from "../utils/notificationLink";
import { useMarkPushNotificationRead } from "./usePushQueries";

export interface NotificationTarget {
  notificationId: number | null;
  link: string | null;
}

/**
 * Follows a notification's link, like openNotificationLink, and first
 * switches to the shop the link is about when another one is open (the
 * "debts due" push names its shop); the screen then opens once the app is
 * back on its main screens. Resolves false when there was nothing to follow.
 */
export function useFollowNotificationLink() {
  const { currentOrganization, selectOrganization } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  return useCallback(
    async (link: string | null | undefined): Promise<boolean> => {
      const target = parseNotificationLink(link);
      const route = target?.kind === "internal" ? matchInternalRoute(target.path) : null;
      const organizationId = route ? getRouteOrganizationId(route) : null;
      if (
        !route ||
        organizationId === null ||
        !currentOrganization ||
        organizationId === currentOrganization.id
      ) {
        return openNotificationLink(link);
      }
      deferInternalRoute(route);
      try {
        await selectOrganization(organizationId);
      } catch {
        // Not one of this user's shops any more, or no connection: say so
        // and stay, rather than show another shop's list as if it were it.
        deferInternalRoute(null);
        showToast(t("dueClients.switchError"), "error");
      }
      return true;
    },
    [currentOrganization, selectOrganization, showToast, t],
  );
}

/**
 * What a tap on a push does, whether it was the system notification or the
 * in-app banner: follow its link, or open the inbox when it has none.
 */
export function useOpenNotification() {
  const { mutate: markRead } = useMarkPushNotificationRead();
  const follow = useFollowNotificationLink();

  return useCallback(
    async ({ notificationId, link }: NotificationTarget) => {
      if (await follow(link)) {
        // Going where it pointed is acting on it, so it stops counting as
        // unread. The inbox does the same when a row is tapped.
        if (notificationId !== null) markRead(notificationId);
        return;
      }
      navigateToPushNotification(notificationId);
    },
    [follow, markRead],
  );
}
