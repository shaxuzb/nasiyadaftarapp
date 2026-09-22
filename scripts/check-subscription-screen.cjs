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
assert.match(screen, /plan\.transactionSmsEnabled/);
assert.match(screen, /plan\.prioritySupportEnabled/);
assert.doesNotMatch(screen, /normalized === "PRO"/);
assert.match(settings, /navigation\.navigate\("Subscription"\)/);
assert.match(navigation, /name="Subscription"/);
assert.match(navigation, /name="PaymentHistory"/);
console.log("Subscription catalog UI routing and payment boundary passed");
