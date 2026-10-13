/**
 * The public links the app hands out: support, social profiles and whatever
 * the backend adds later. The list comes from GET /app/links, so a link can be
 * changed or added without shipping a new build.
 */

export interface AppLink {
  key: string;
  title: string;
  url: string;
}

/** Keys the app has its own wording and icon for. Any other key still shows. */
export const KNOWN_APP_LINK_KEYS = [
  "support",
  "telegram_group",
  "instagram",
  "organization_bot",
  "client_bot",
] as const;

export type KnownAppLinkKey = (typeof KNOWN_APP_LINK_KEYS)[number];

export function isKnownAppLinkKey(key: string): key is KnownAppLinkKey {
  return (KNOWN_APP_LINK_KEYS as readonly string[]).includes(key);
}

/**
 * Used until the first answer arrives on a fresh install with no connection,
 * and for a key the server stops sending while a button still depends on it.
 */
export const DEFAULT_APP_LINKS: readonly AppLink[] = [
  {
    key: "telegram_group",
    title: "Telegram",
    url: "https://t.me/+cPd_xrh7bVI0NTVi",
  },
  {
    key: "instagram",
    title: "Instagram",
    url: "https://www.instagram.com/qarzdaftar.rbsx/",
  },
  { key: "support", title: "Admin", url: "https://t.me/richdev_1" },
  // The owner's bot has always had this address. The customers' bot has no
  // fallback: until the server names it, it is simply not offered.
  {
    key: "organization_bot",
    title: "Telegram bot",
    url: "https://t.me/qarz_daftar_rbsx_bot",
  },
];

/**
 * Where each link the server sends is used:
 *
 *   instagram, telegram_group      icons in the profile header
 *   support                        the profile's "contact and support" row,
 *                                  and the admin contact buttons elsewhere
 *   organization_bot, client_bot   the sheet behind the "Telegram bot" row
 */
export const HEADER_APP_LINK_KEYS = ["instagram", "telegram_group"] as const;

/** The owner's daily-report bot first, then the bot customers talk to. */
export const TELEGRAM_BOT_LINK_KEYS = ["organization_bot", "client_bot"] as const;

/** Header icons, in the header's own order; only for links that were sent. */
export function getHeaderAppLinks(links: readonly AppLink[]): AppLink[] {
  return HEADER_APP_LINK_KEYS.flatMap((key) => findAppLink(links, key) ?? []);
}

/**
 * The bots behind the profile's "Telegram bot" row, in the sheet's order. A
 * bot the server did not list falls back to the bundled address when there is
 * one, so the row never opens an empty sheet.
 */
export function getTelegramBotLinks(links: readonly AppLink[]): AppLink[] {
  return TELEGRAM_BOT_LINK_KEYS.flatMap(
    (key) => findAppLink(links, key) ?? findAppLink(DEFAULT_APP_LINKS, key) ?? [],
  );
}

/**
 * The address is supplied by a server and handed straight to the OS, so only
 * the kinds a support link can sensibly be are let through: a secure web page,
 * a phone number or an email address. Anything else is dropped.
 */
export function isOpenableLinkUrl(url: string): boolean {
  if (/^https:\/\/[^\s/?#]+\.[^\s/?#]+/i.test(url)) return !/\s/.test(url);
  return /^(tel:\+?[\d\s()-]{3,}|mailto:[^\s@]+@[^\s@]+)$/i.test(url);
}

/**
 * An address as the OS will accept it. One written with Cyrillic or other
 * non-ASCII characters is fine to type and to send, but iOS refuses to open it
 * until those characters are escaped. What is already escaped is left alone.
 */
export function toOpenableUrl(url: string): string {
  return url.replace(/[^\u0000-\u007F]+/g, (run) => encodeURIComponent(run));
}

/** "youtube.com" for "https://www.youtube.com/@x" — a caption for an unknown link. */
export function getLinkHost(url: string): string {
  const match = /^https:\/\/([^\s/?#]+)/i.exec(url);
  return match ? match[1].replace(/^www\./i, "").toLowerCase() : "";
}

/**
 * Reads the endpoint's answer. An answer that is not a list is an error, so the
 * caller keeps what it had; a malformed entry is skipped without costing the
 * rest of the list. Order is the server's.
 */
export function parseAppLinks(payload: unknown): AppLink[] {
  if (!Array.isArray(payload)) {
    throw new Error("App links response is not a list");
  }

  const links: AppLink[] = [];
  const seen = new Set<string>();
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const { key, title, url } = item as Record<string, unknown>;
    if (typeof key !== "string" || typeof url !== "string") continue;

    const cleanKey = key.trim();
    const cleanUrl = url.trim();
    // The server sends full https:// addresses. Anything else, such as a bare
    // handle, is not guessed at: the entry is skipped.
    if (!cleanKey || !isOpenableLinkUrl(cleanUrl)) continue;

    // The same key twice would give two rows that read the same.
    if (seen.has(cleanKey)) continue;
    seen.add(cleanKey);

    links.push({
      key: cleanKey,
      title: typeof title === "string" ? title.trim() : "",
      url: cleanUrl,
    });
  }
  return links;
}

export function findAppLink(
  links: readonly AppLink[],
  key: string,
): AppLink | undefined {
  return links.find((link) => link.key === key);
}
