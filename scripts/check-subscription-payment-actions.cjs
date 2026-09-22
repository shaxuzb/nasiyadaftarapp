const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/screens/SubscriptionScreen.tsx", "utf8");
const profileSource = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");

assert.match(source, /openSheet\("paymentCheckout"/);
assert.match(source, /productType:\s*"subscription"/);
assert.match(source, /productType:\s*"sms_package"/);
assert.doesNotMatch(
  source,
  /navigation\.navigate\("PaymentHistory"\)/,
  "Payment history must stay outside the subscription purchase screen",
);
assert.match(
  profileSource,
  /navigation\.navigate\("PaymentHistory"\)/,
  "Payment history must remain accessible from the profile/settings area",
);
assert.doesNotMatch(source, /onPress=\{\(\) => void openAdminContact\(\)\}/);

// Picking a plan goes straight to payment; the cancel-then-buy detour is gone.
assert.doesNotMatch(
  source,
  /subscriptionCancellation/,
  "Plan selection must not route through a cancellation sheet",
);

// A cheaper plan can only start once the paid period ends, so its button is
// replaced by an explanation instead of firing a request that gets a 409.
assert.match(
  source,
  /getPlanPurchaseAvailability/,
  "The plan list must check whether the transition is allowed",
);
assert.match(
  source,
  /availability\.allowed/,
  "A blocked transition must render something other than the buy button",
);
assert.match(
  source,
  /subscription\.downgradeBlocked/,
  "A blocked downgrade must explain itself to the user",
);

console.log("Subscription payment actions contract passed");
