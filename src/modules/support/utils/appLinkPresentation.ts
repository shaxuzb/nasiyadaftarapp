import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

import type { TranslateKey } from "../../../i18n";
import {
  getLinkHost,
  isKnownAppLinkKey,
  type AppLink,
  type KnownAppLinkKey,
} from "./appLinks";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Translate = (key: TranslateKey) => string;

// Ionicons ships the Instagram mark but no Telegram one, so the Telegram group
// uses a paper plane. Adding FontAwesome for that single glyph would put
// another 162 KB font in the bundle. The two bots are told apart by what they
// are for: a report for the owner, people for the customers.
const ICONS: Record<KnownAppLinkKey, IconName> = {
  support: "chatbubble-ellipses-outline",
  telegram_group: "paper-plane-outline",
  instagram: "logo-instagram",
  organization_bot: "bar-chart-outline",
  client_bot: "people-outline",
};

/** A key the app does not know yet still gets a row, with this icon. */
const GENERIC_ICON: IconName = "link-outline";

export function getAppLinkIcon(key: string): IconName {
  return isKnownAppLinkKey(key) ? ICONS[key] : GENERIC_ICON;
}

/**
 * Known keys are worded by the app, in the user's language. An unknown key
 * shows the title the server sent, or its address when that is missing.
 */
export function getAppLinkTitle(link: AppLink, t: Translate): string {
  if (isKnownAppLinkKey(link.key)) return t(`support.links.${link.key}.title`);
  return link.title || getLinkHost(link.url) || link.key;
}

export function getAppLinkDescription(link: AppLink, t: Translate): string {
  if (isKnownAppLinkKey(link.key)) {
    return t(`support.links.${link.key}.description`);
  }
  // Where the link leads, unless that is already what the title says.
  const host = getLinkHost(link.url);
  return host && host !== getAppLinkTitle(link, t) ? host : "";
}
