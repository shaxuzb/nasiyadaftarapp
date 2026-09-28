import { Linking } from "react-native";

// The public profiles we hand out, so keeping them in the bundle is the point.
const INSTAGRAM_URL = "https://www.instagram.com/qarzdaftar.rbsx/";
const TELEGRAM_COMMUNITY_URL = "https://t.me/+cPd_xrh7bVI0NTVi";

/**
 * Both links are https, so `canOpenURL` only fails when the device has nothing
 * that can open a web address at all. The thrown message never reaches the
 * screen — callers pass the error to `getLocalizedApiErrorMessage`, which
 * substitutes a translated sentence — so it is written for a log, not a reader.
 */
async function openExternalLink(url: string): Promise<void> {
  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    throw new Error(`No handler available for ${url}`);
  }

  await Linking.openURL(url);
}

export function openInstagramProfile(): Promise<void> {
  return openExternalLink(INSTAGRAM_URL);
}

export function openTelegramCommunity(): Promise<void> {
  return openExternalLink(TELEGRAM_COMMUNITY_URL);
}
