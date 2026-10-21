// When a plan began and when it ends, a quiet reminder in its last days, and
// a renewal that is shown as a demo until it is built.

const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");
const plans = read("src/screens/SubscriptionScreen.tsx");
const profile = read("src/screens/SettingsScreen.tsx");
const customers = read("src/screens/CustomersScreen.tsx");
const banner = read("src/modules/subscription/components/RenewalReminderBanner.tsx");
const period = read("src/modules/subscription/utils/subscriptionPeriod.ts");
const uz = read("src/i18n/translations/uz.ts");
const ru = read("src/i18n/translations/ru.ts");

/* The reminder window is three days. */

assert.match(period, /export const RENEWAL_REMINDER_DAYS = 3;/);

/* Dates on the current plan's card, and nowhere for a plan with no end. */

assert.match(plans, /const currentPeriod = useMemo\(\(\) => getSubscriptionPeriod\(current\), \[current\]\);/);
// The time left is the card's last line, under the chips and the renewal.
assert.match(plans, /\{isCurrent && periodRange \? \(\s*<View style=\{styles\.periodFooter\}>/);
assert.doesNotMatch(plans, /styles\.periodRow/, "Not under the tagline any more");
assert.ok(
  plans.indexOf("<View style={styles.featureChips}>") < plans.indexOf("<View style={styles.renewBlock}>") &&
    plans.indexOf("<View style={styles.renewBlock}>") < plans.indexOf("<View style={styles.periodFooter}>"),
  "Chips, then the renewal, then the time left",
);
assert.match(
  plans,
  /<View style=\{styles\.periodFooter\}>[\s\S]{0,1600}<\/View>\s*\) : null\}\s*<\/Pressable>/,
  "Nothing after it on the card",
);
assert.match(plans, /currentPeriod\.endAt\s*\? \[/, "No end date, no dates shown");

/* The demo renewal: on the current paid plan, labelled, and not pressable. */

const renewStart = plans.indexOf("<View style={styles.renewBlock}>");
assert.ok(renewStart > 0, "The renewal block is on the card");
// The block runs to the end of the card.
const renew = plans.slice(renewStart, plans.indexOf("</Pressable>", renewStart));
assert.match(renew, /accessibilityState=\{\{ disabled: true \}\}/);
assert.doesNotMatch(renew, /onPress/, "A demo renewal cannot be pressed");
assert.match(renew, /t\("subscription\.demoBadge"\)/);
assert.match(renew, /t\("subscription\.renewComingSoon"\)/);

/* The profile's plan row says until when. */

assert.match(profile, /getSubscriptionPeriod\(subscription\)/);
assert.match(profile, /t\("subscription\.validUntil", \{/);
assert.match(profile, /\{subscriptionUntil \? \(\s*<Text\s+style=\{\[\s*styles\.profilePlanUntil,/);

/* The home reminder: one strip, closable for the day, no request of its own. */

assert.match(customers, /<RenewalReminderBanner \/>\s*<PendingPaymentBanner \/>/);
assert.match(banner, /const subscription = user\?\.subscription;/, "Uses the subscription the app already holds");
assert.doesNotMatch(banner, /useQuery|useCurrentSubscription|apiClient|fetch\(/, "No request of its own");
assert.match(
  banner,
  /const relevant =\s*period\.endingSoon &&\s*dismissalKey !== null &&\s*regionalCapabilities\.subscriptionVisible &&\s*!isAdministrator;/,
  "Only in the last days, only where plans are sold, never for the administrator",
);
assert.match(banner, /if \(!relevant \|\| dismissed !== false \|\| period\.daysLeft === null\) return null;/, "No flash before the note is read");
assert.match(banner, /onPress=\{\(\) => navigation\.navigate\("Subscription"\)\}/);
assert.match(banner, /accessibilityLabel=\{t\("subscription\.reminderDismiss"\)\}/);
assert.match(banner, /AsyncStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(dismissalKey\)\)/);

/* Wording in both languages. */

for (const [name, source] of [["uz.ts", uz], ["ru.ts", ru]]) {
  for (const key of [
    "daysLeft", "endsToday", "periodEnded", "validUntil", "renewPlan", "renewComingSoon",
    "demoBadge", "reminderDays", "reminderTomorrow", "reminderToday", "reminderAction", "reminderDismiss",
  ]) {
    assert.match(source, new RegExp("\\n    " + key + ': "[^"]+",'), name + ": subscription." + key);
  }
}

console.log("Subscription period: dates, the 3-day reminder and the demo renewal passed");
