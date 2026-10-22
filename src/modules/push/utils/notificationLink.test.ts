import assert from "node:assert/strict";
import {
  INTERNAL_ROUTE_RULES,
  matchInternalRoute,
  parseNotificationLink,
  parseRouteId,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./notificationLink.ts";

/* "/" means a screen in the app; anything else is an outside address. */

assert.deepEqual(parseNotificationLink("/customers/42"), {
  kind: "internal",
  path: "/customers/42",
});
assert.deepEqual(parseNotificationLink("  /reports  "), { kind: "internal", path: "/reports" });
assert.deepEqual(parseNotificationLink("https://t.me/qarzdaftar"), {
  kind: "external",
  url: "https://t.me/qarzdaftar",
});

/* No link means "as before": the caller opens the inbox. */

for (const missing of [undefined, null, "", "   ", 5, {}, []]) {
  assert.equal(parseNotificationLink(missing), null);
}
assert.equal(
  parseNotificationLink("//evil.example/path"),
  null,
  "A scheme-less address is not a path inside the app",
);

/* Matching, against a table of the kind the backend's list becomes. */

const rules = [
  { pattern: "/reports", build: () => ({ screen: "MainTabs" as const, tab: "Reports" as const }) },
  {
    pattern: "/customers/:customerId",
    build: (params: Record<string, string>) => {
      const customerId = parseRouteId(params.customerId);
      return customerId
        ? { screen: "CustomerDetail" as const, params: { customerId } }
        : null;
    },
  },
  {
    pattern: "/videos",
    build: (_params: Record<string, string>, query: Record<string, string>) => ({
      screen: "VideoLessons" as const,
      params: query.lesson ? { lessonId: query.lesson } : undefined,
    }),
  },
];

assert.deepEqual(matchInternalRoute("/reports", rules), { screen: "MainTabs", tab: "Reports" });
assert.deepEqual(matchInternalRoute("/Reports/", rules), { screen: "MainTabs", tab: "Reports" });
assert.deepEqual(matchInternalRoute("/reports?from=push#top", rules), {
  screen: "MainTabs",
  tab: "Reports",
});
assert.deepEqual(matchInternalRoute("/customers/42", rules), {
  screen: "CustomerDetail",
  params: { customerId: 42 },
});
assert.deepEqual(matchInternalRoute("/videos?lesson=sms", rules), {
  screen: "VideoLessons",
  params: { lessonId: "sms" },
});

/* A path that is not in the table, or whose values are unusable, matches nothing. */

for (const path of [
  "/",
  "/unknown",
  "/reports/extra",
  "/customers",
  "/customers/abc",
  "/customers/0",
  "/customers/-3",
  "/customers/1.5",
]) {
  assert.equal(matchInternalRoute(path, rules), null, path);
}

/* A malformed escape must not throw; it simply does not match. */

assert.equal(matchInternalRoute("/customers/%E0%A4%A", rules), null);

/* Ids */

assert.equal(parseRouteId("42"), 42);
for (const bad of [undefined, "", "0", "-1", "1.5", "4a", " 4", "99999999999999999999"]) {
  assert.equal(parseRouteId(bad), null);
}

/* The real table: every path the backend may send. */

for (const [path, expected] of [
  ["/customers", { screen: "MainTabs", tab: "Customers" }],
  ["/customers/427", { screen: "CustomerDetail", params: { customerId: 427 } }],
  ["/reports", { screen: "MainTabs", tab: "Reports" }],
  ["/sms", { screen: "MainTabs", tab: "ClientSms" }],
  ["/sms/history", { screen: "ClientSmsHistory" }],
  ["/profile", { screen: "MainTabs", tab: "Settings" }],
  ["/subscription", { screen: "Subscription" }],
  ["/tariffs", { screen: "Subscription" }],
  ["/payments", { screen: "PaymentHistory" }],
  ["/security", { screen: "AccountSecurity" }],
  ["/blacklist", { screen: "BlacklistSettings" }],
  ["/notifications", { screen: "Notifications" }],
  ["/notification-settings", { screen: "NotificationSettings" }],
  ["/videos", { screen: "VideoLessons" }],
  ["/videos/sms", { screen: "VideoLessons", params: { lessonId: "sms" } }],
  ["/videos/no-such-lesson", { screen: "VideoLessons" }],
  // Forgiving about case, a trailing slash and a query.
  ["/Subscription/", { screen: "Subscription" }],
  ["/sms?from=push", { screen: "MainTabs", tab: "ClientSms" }],
] as const) {
  assert.deepEqual(matchInternalRoute(path), expected, path);
}

for (const path of [
  "/",
  "/unknown",
  "/customers/abc",
  "/customers/0",
  "/sms/history/extra",
  "/pin",
  "/pin-change",
]) {
  assert.equal(matchInternalRoute(path), null, path);
}

assert.equal(
  new Set(INTERNAL_ROUTE_RULES.map((rule: { pattern: string }) => rule.pattern)).size,
  INTERNAL_ROUTE_RULES.length,
  "Two rules for one path: the second would never be reached",
);
for (const rule of INTERNAL_ROUTE_RULES) {
  assert.match(rule.pattern, /^\/[\w/:-]*$/, `Malformed pattern: ${rule.pattern}`);
}

console.log("Notification link parsing and route matching tests passed");
