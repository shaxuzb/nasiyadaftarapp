import {
  getNotificationLinkFromData,
  parseNotificationId,
  parseNotificationLinkValue,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./notificationPayload.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

assert(parseNotificationId(42) === 42, "Numeric notification ID must parse");
assert(
  parseNotificationId(" 42 ") === 42,
  "String notification ID must parse",
);
assert(parseNotificationId(undefined) === null, "Missing ID must be null");
assert(parseNotificationId("invalid") === null, "Invalid ID must be null");
assert(parseNotificationId("1.5") === null, "Fractional ID must be null");
assert(parseNotificationId(0) === null, "Zero ID must be null");

assert(
  getNotificationLinkFromData({ link: " /customers/5 " }) === "/customers/5",
  "data.link must be read and trimmed",
);
assert(
  getNotificationLinkFromData({ notificationId: "4" }) === null,
  "A push without data.link has no link",
);
assert(getNotificationLinkFromData(undefined) === null, "No data, no link");
assert(parseNotificationLinkValue("") === null, "An empty link is no link");
assert(parseNotificationLinkValue("   ") === null, "A blank link is no link");
assert(parseNotificationLinkValue(null) === null, "A null link is no link");
assert(parseNotificationLinkValue(7) === null, "A non-text link is no link");

console.log("Push notification payload tests passed");
