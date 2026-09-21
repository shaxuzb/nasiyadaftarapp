const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/screens/SubscriptionScreen.tsx", "utf8");
const profileSource = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const cancellation = fs.readFileSync(
  "src/bottom-sheet/sheets/SubscriptionCancellationSheet.tsx",
  "utf8",
);

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
assert.match(cancellation, /useConfirmDialog/);
assert.match(cancellation, /cancelPlanConfirmTitle/);
assert.match(cancellation, /cancelPlanConfirmMessage/);
assert.match(cancellation, /variant:\s*"danger"/);

console.log("Subscription payment actions contract passed");
