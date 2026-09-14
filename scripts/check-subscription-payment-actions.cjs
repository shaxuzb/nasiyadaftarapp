const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/screens/SubscriptionScreen.tsx", "utf8");

assert.match(source, /openSheet\("paymentCheckout"/);
assert.match(source, /productType:\s*"subscription"/);
assert.match(source, /productType:\s*"sms_package"/);
assert.match(source, /navigation\.navigate\("PaymentHistory"\)/);
assert.doesNotMatch(source, /onPress=\{\(\) => void openAdminContact\(\)\}/);

console.log("Subscription payment actions contract passed");
