import type { MainTabParamList, RootStackParamList } from "../../../types";

/**
 * Where a notification leads. The backend sends one string, `link`, with the
 * push (`data.link`) and with each inbox item:
 *
 *   - starts with "/"  → a screen inside the app
 *   - anything else    → an address to hand to the browser, Telegram, etc.
 *   - missing or empty → nowhere in particular; the inbox opens, as before
 */
export type NotificationLinkTarget =
  | { kind: "internal"; path: string }
  | { kind: "external"; url: string };

export function parseNotificationLink(value: unknown): NotificationLinkTarget | null {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (!link) return null;
  // "//host/path" is an address without its scheme, not a path in the app.
  if (link.startsWith("//")) return null;
  if (link.startsWith("/")) return { kind: "internal", path: link };
  return { kind: "external", url: link };
}

/** A screen the app can be sent to. */
export type InternalRoute =
  | { screen: "MainTabs"; tab: keyof MainTabParamList }
  | {
      screen: Exclude<keyof RootStackParamList, "MainTabs">;
      params?: Record<string, unknown>;
    };

export interface InternalRouteRule {
  /** "/customers/:customerId" — a ":name" segment matches any one segment. */
  pattern: string;
  /**
   * Turns the matched segments (and any `?query` values) into a screen, or
   * returns null when they are unusable, such as an id that is not a number.
   */
  build: (
    params: Readonly<Record<string, string>>,
    query: Readonly<Record<string, string>>,
  ) => InternalRoute | null;
}

/**
 * The paths the backend sends, and the screen each one opens.
 *
 * Empty on purpose: today the backend sends full https:// addresses, which
 * need no entry here. Add a rule when it starts sending a path; until then a
 * "/..." link opens the inbox, which is also what an older build does with a
 * path added after it shipped.
 */
export const INTERNAL_ROUTE_RULES: readonly InternalRouteRule[] = [];

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function splitPath(path: string): { segments: string[]; query: Record<string, string> } {
  const [withoutHash] = path.split("#");
  const [pathname, search = ""] = withoutHash.split("?");
  const query: Record<string, string> = {};
  for (const pair of search.split("&")) {
    if (!pair) continue;
    const [name, value = ""] = pair.split("=");
    if (name) query[decode(name)] = decode(value);
  }
  return {
    segments: pathname.split("/").filter(Boolean).map(decode),
    query,
  };
}

export function matchInternalRoute(
  path: string,
  rules: readonly InternalRouteRule[] = INTERNAL_ROUTE_RULES,
): InternalRoute | null {
  const { segments, query } = splitPath(path);

  for (const rule of rules) {
    const pattern = rule.pattern.split("/").filter(Boolean);
    if (pattern.length !== segments.length) continue;

    const params: Record<string, string> = {};
    const matches = pattern.every((expected, index) => {
      const actual = segments[index];
      if (expected.startsWith(":")) {
        params[expected.slice(1)] = actual;
        return true;
      }
      return expected.toLowerCase() === actual.toLowerCase();
    });
    if (!matches) continue;

    const route = rule.build(params, query);
    if (route) return route;
  }
  return null;
}

/** A positive whole number from a path segment, for ids; otherwise null. */
export function parseRouteId(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
