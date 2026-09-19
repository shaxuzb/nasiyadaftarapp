// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { parseNotificationId } from "./notificationPayload.ts";

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

console.log("Push notification payload tests passed");
