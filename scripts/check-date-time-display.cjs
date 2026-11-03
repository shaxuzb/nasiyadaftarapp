// A moment (an SMS sent, a payment made, a notification received, a record
// entered) shows its time as well as its date: "31-okt, 2026, 15:07". The time
// is the server's, as written. A calendar date (a plan's period, a date
// picked in a filter) stays a date.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const MOMENTS = {
  "src/modules/client-sms/components/SmsHistoryRow.tsx": ["item.sentAt", "item.estimatedSendDate"],
  "src/modules/client-sms/components/SmsRecipientRow.tsx": ["recipient.nextSmsAvailableDate"],
  "src/modules/payments/components/PaymentOrderContent.tsx": ["order.createdDate", "order.paidDate", "order.fulfilledDate"],
  "src/screens/PaymentHistoryScreen.tsx": ["item.paidDate ?? item.createdDate"],
  "src/screens/NotificationsScreen.tsx": ["item.createdDate"],
  "src/bottom-sheet/sheets/BlacklistOrganizationsSheet.tsx": ["since"],
  "src/bottom-sheet/sheets/TransactionDetailSheet.tsx": ["transaction.date"],
  "src/screens/CustomerDetailScreen.tsx": ["tx.date", "new Date()"],
};
for (const [file, values] of Object.entries(MOMENTS)) {
  const source = read(file);
  assert.doesNotMatch(source, /\bformatLocalizedDate\(/, `${file}: a moment shows its time too`);
  for (const value of values) {
    assert.ok(source.includes(`formatLocalizedDateTime(${value}, locale)`), `${file}: ${value} with its time`);
  }
}

// The badge beside the last SMS status: "21.10, 15:00".
const presentation = read("src/modules/client-sms/utils/smsStatusPresentation.ts");
assert.match(presentation, /return match\[4\] === undefined \? date : date \+ ", " \+ match\[4\] \+ ":" \+ match\[5\];/);

// Calendar dates stay dates: the plan's period and its end on the profile.
assert.match(read("src/screens/SubscriptionScreen.tsx"), /formatLocalizedDate\(currentPeriod\.endAt, locale\)/);
assert.match(read("src/screens/SettingsScreen.tsx"), /formatLocalizedDate\(subscriptionPeriod\.endAt, locale\)/);

// No time zone arithmetic: the time is read off the text.
const formatters = read("src/i18n/formatters.ts");
const dateTime = formatters.slice(formatters.indexOf("export function formatLocalizedDateTime"));
assert.match(dateTime, /const match = SERVER_DATE_TIME\.exec\(value\.trim\(\)\);/);
assert.doesNotMatch(dateTime, /getTimezoneOffset|toLocaleTimeString|timeZone/);
assert.match(dateTime, /return hours === undefined \? datePart : `\$\{datePart\}, \$\{hours\}:\$\{minutes\}`;/, "No time: the date alone, never 00:00");

console.log("Dates with times: moments show the server's time, calendar dates stay dates");
