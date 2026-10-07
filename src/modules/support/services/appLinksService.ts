import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";

import { apiClient } from "../../../services/axiosService";
import { parseAppLinks, toOpenableUrl, type AppLink } from "../utils/appLinks";

const CACHE_KEY = "app_links_v1";

// The last list this run has seen, from the server or from storage, so a
// screen opened later starts with it instead of with the bundled fallback.
let remembered: AppLink[] | null = null;

export function getRememberedAppLinks(): AppLink[] | null {
  return remembered;
}

/** The endpoint is public; it answers the same with or without a session. */
export async function fetchAppLinks(): Promise<AppLink[]> {
  const { data } = await apiClient.get<unknown>("/app/links");
  const links = parseAppLinks(data);
  remembered = links;
  // Kept for the next launch without a connection. Failing to store it must
  // not turn a good answer into an error.
  void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(links)).catch(
    () => undefined,
  );
  return links;
}

/** The list saved by the last successful request, or null when there is none. */
export async function readCachedAppLinks(): Promise<AppLink[] | null> {
  if (remembered) return remembered;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    // Parsed like a server answer, so a stored value from an older version is
    // held to today's rules.
    const links = parseAppLinks(JSON.parse(raw));
    // A request that finished while storage was being read is the newer one.
    remembered ??= links;
    return remembered;
  } catch {
    return null;
  }
}

/** Rejects when the device has nothing that can open the address. */
export async function openExternalLink(url: string): Promise<void> {
  await Linking.openURL(toOpenableUrl(url));
}
