import { navigateToInternalRoute } from "../../../navigation/navigationRef";
import { openExternalLink } from "../../support/services/appLinksService";
import { getLinkHost, isOpenableLinkUrl } from "../../support/utils/appLinks";
import {
  matchInternalRoute,
  parseNotificationLink,
} from "../utils/notificationLink";

/** What an inbox row can tell the user about where its link leads. */
export type NotificationLinkInfo =
  | { kind: "internal" }
  /** `host` is the site, such as "t.me"; empty for a phone number or an email. */
  | { kind: "external"; host: string };

/**
 * Describes a notification's link, or returns null when tapping it would take
 * the user nowhere. Lets the inbox show an "open" action on the rows that have
 * somewhere to go, and only on those.
 */
export function describeNotificationLink(
  link: string | null | undefined,
): NotificationLinkInfo | null {
  const target = parseNotificationLink(link);
  if (!target) return null;
  if (target.kind === "internal") {
    return matchInternalRoute(target.path) ? { kind: "internal" } : null;
  }
  return isOpenableLinkUrl(target.url)
    ? { kind: "external", host: getLinkHost(target.url) }
    : null;
}

/**
 * Follows a notification's link: a screen in the app, or an outside address
 * handed to whatever opens it (the browser, Telegram, the dialer).
 *
 * Resolves to false when there was nothing to follow — no link, a path this
 * build does not know, a screen not offered on this device, an address that
 * is not safe to open — so the caller can fall back to the inbox.
 */
export async function openNotificationLink(
  link: string | null | undefined,
): Promise<boolean> {
  const target = parseNotificationLink(link);
  if (!target) return false;

  if (target.kind === "internal") {
    const route = matchInternalRoute(target.path);
    return route ? navigateToInternalRoute(route) : false;
  }

  // The address comes from a server and goes straight to the OS, so it is
  // held to the same rule as the support links.
  if (!isOpenableLinkUrl(target.url)) return false;
  try {
    await openExternalLink(target.url);
    return true;
  } catch {
    return false;
  }
}
