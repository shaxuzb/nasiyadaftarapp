import assert from "node:assert/strict";
import {
  getSubscriptionPeriod,
  isRenewalReminderDismissed,
  parseRenewalReminderDismissal,
  RENEWAL_REMINDER_DAYS,
  toLocalDayKey,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./subscriptionPeriod.ts";

// Local times, so the tests mean the same in any time zone.
const at = (year: number, month: number, day: number, hour = 12) =>
  new Date(year, month - 1, day, hour).getTime();
const iso = (time: number) => new Date(time).toISOString();

/* No end: the free plan. Nothing to count, nothing to remind. */

const free = getSubscriptionPeriod({ startAt: iso(at(2026, 10, 1)), endAt: null }, at(2026, 10, 20));
assert.equal(free.endAt, null);
assert.equal(free.daysLeft, null);
assert.equal(free.endingSoon, false);
assert.equal(free.ended, false);
assert.ok(free.startAt instanceof Date);
assert.equal(getSubscriptionPeriod(null).daysLeft, null);
assert.equal(getSubscriptionPeriod({ endAt: "not a date" }).endAt, null);

/* Days are calendar days: the hour does not change "today" or "tomorrow". */

const end = at(2026, 10, 31, 9);
const subscription = { startAt: iso(at(2026, 10, 1)), endAt: iso(end) };
assert.equal(getSubscriptionPeriod(subscription, at(2026, 10, 20)).daysLeft, 11);
assert.equal(getSubscriptionPeriod(subscription, at(2026, 10, 30, 23)).daysLeft, 1, "Late the evening before: tomorrow");
assert.equal(getSubscriptionPeriod(subscription, at(2026, 10, 31, 1)).daysLeft, 0, "The last day, before the hour: today");

/* The reminder window. */

assert.equal(RENEWAL_REMINDER_DAYS, 3);
assert.equal(getSubscriptionPeriod(subscription, at(2026, 10, 27)).endingSoon, false, "Four days left: not yet");
assert.equal(getSubscriptionPeriod(subscription, at(2026, 10, 28)).endingSoon, true, "Three days left");
assert.equal(getSubscriptionPeriod(subscription, at(2026, 10, 31, 1)).endingSoon, true, "The last day");

/* Over: no reminder, the server has moved the user on. */

const over = getSubscriptionPeriod(subscription, at(2026, 10, 31, 10));
assert.equal(over.ended, true);
assert.equal(over.endingSoon, false);
assert.equal(over.daysLeft, 0);

/* Closing the reminder lasts one day, for one user, for one end date. */

const today = toLocalDayKey(at(2026, 10, 28));
assert.equal(today, "2026-10-28");
const current = { userId: 7, endAt: iso(end), day: today };
assert.equal(isRenewalReminderDismissed(null, current), false);
assert.equal(isRenewalReminderDismissed({ ...current }, current), true);
assert.equal(isRenewalReminderDismissed({ ...current, day: "2026-10-27" }, current), false, "Back the next day");
assert.equal(isRenewalReminderDismissed({ ...current, userId: 8 }, current), false, "Another account");
assert.equal(
  isRenewalReminderDismissed({ ...current, endAt: iso(at(2026, 11, 30)) }, current),
  false,
  "A renewed plan gets its own reminder",
);

/* What is stored is read back, and anything else is ignored. */

assert.deepEqual(parseRenewalReminderDismissal(JSON.stringify(current)), current);
for (const raw of [null, "", "{broken", "[]", JSON.stringify({ userId: "7", endAt: "x", day: "y" })]) {
  assert.equal(parseRenewalReminderDismissal(raw), null, String(raw));
}

console.log("Subscription period tests passed");
