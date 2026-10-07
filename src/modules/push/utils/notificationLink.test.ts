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

/* The backend sends full addresses today; whatever rules are added must be well formed. */

assert.ok(Array.isArray(INTERNAL_ROUTE_RULES));
for (const rule of INTERNAL_ROUTE_RULES) {
  assert.match(rule.pattern, /^\/[\w/:-]*$/, `Malformed pattern: ${rule.pattern}`);
}

console.log("Notification link parsing and route matching tests passed");
