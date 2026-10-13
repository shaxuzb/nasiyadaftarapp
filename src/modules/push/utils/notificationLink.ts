import type { MainTabParamList, RootStackParamList } from "../../../types";
import type { VideoLessonId } from "../../video-lessons/utils/videoLessons";

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

const tab = (name: keyof MainTabParamList) => (): InternalRoute => ({
  screen: "MainTabs",
  tab: name,
});

const screen =
  (name: Exclude<keyof RootStackParamList, "MainTabs">) => (): InternalRoute => ({
    screen: name,
  });

// Kept here as plain text so this file stays free of runtime imports; the
// type makes a misspelt or removed lesson a compile error.
const VIDEO_LESSON_IDS: readonly VideoLessonId[] = [
  "register",
  "customers",
  "reports",
  "sms",
  "profile",
  "payment",
];

/**
 * The paths a notification may carry, and the screen each one opens. This
 * list is the contract with the backend: it sends one of these as `link`.
 *
 * A path that is not listed is not an error. The notification opens the inbox
 * instead, which is also what an older build does with a path added after it
 * shipped. The same happens when the screen is not offered on this device
 * (some are left out by region or plan).
 *
 * Changing the PIN is deliberately not reachable from a notification.
 */
export const INTERNAL_ROUTE_RULES: readonly InternalRouteRule[] = [
  { pattern: "/customers", build: tab("Customers") },
  {
    pattern: "/customers/:customerId",
    build: ({ customerId }) => {
      const id = parseRouteId(customerId);
      return id ? { screen: "CustomerDetail", params: { customerId: id } } : null;
    },
  },
  { pattern: "/reports", build: tab("Reports") },
  { pattern: "/sms", build: tab("ClientSms") },
  { pattern: "/sms/history", build: screen("ClientSmsHistory") },
  { pattern: "/profile", build: tab("Settings") },
  { pattern: "/subscription", build: screen("Subscription") },
  { pattern: "/payments", build: screen("PaymentHistory") },
  { pattern: "/security", build: screen("AccountSecurity") },
  { pattern: "/blacklist", build: screen("BlacklistSettings") },
  { pattern: "/notifications", build: screen("Notifications") },
  { pattern: "/notification-settings", build: screen("NotificationSettings") },
  { pattern: "/videos", build: screen("VideoLessons") },
  {
    pattern: "/videos/:lessonId",
    build: ({ lessonId }) => {
      const id = VIDEO_LESSON_IDS.find((item) => item === lessonId);
      // An unknown lesson still opens the list; it just starts nothing.
      return id
        ? { screen: "VideoLessons", params: { lessonId: id } }
        : { screen: "VideoLessons" };
    },
  },
];

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
