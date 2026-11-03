const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("src/screens/SubscriptionScreen.tsx", "utf8");
const settings = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");

assert.doesNotMatch(
  screen,
  /^(<<<<<<<|=======|>>>>>>>)/m,
  "Subscription screen must not contain unresolved merge markers",
);

assert.match(screen, /t\("subscription\.screenTitle"\)/);
assert.match(screen, /t\("subscription\.packages"\)/);
assert.match(screen, /openSheet\("paymentCheckout"/);
assert.match(screen, /productType:\s*"subscription"/);
assert.match(screen, /productType:\s*"sms_package"/);
assert.doesNotMatch(
  screen,
  /navigation\.navigate\("PaymentHistory"\)/,
  "Payment history must remain outside the subscription catalog",
);
assert.match(
  settings,
  /navigation\.navigate\("PaymentHistory"\)/,
  "Payment history must be accessible from profile/settings",
);
assert.match(screen, /AdminContactButton/);
assert.doesNotMatch(screen, /openAdminContact\(\)/);
// What a plan includes comes from the server's presentation; the server
// leaves out what a plan does not include, so the card lists only that.
assert.match(
  screen,
  /const visibleFeatures = plan\.presentation\.features;/,
  "A plan card must list only the capabilities its plan includes",
);
assert.doesNotMatch(
  screen,
  /!feature\.enabled/,
  "A card must not spell out what a plan leaves out; that reads as a warning on the card asking to be chosen",
);
assert.match(screen, /name="chevron-forward"/);
assert.doesNotMatch(screen, /normalized === "PRO"/);
assert.match(settings, /navigation\.navigate\("Subscription"\)/);
assert.match(navigation, /name="Subscription"/);
assert.match(navigation, /name="PaymentHistory"/);
console.log("Subscription catalog UI routing and payment boundary passed");
