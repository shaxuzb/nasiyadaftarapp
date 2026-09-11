const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("src/screens/SubscriptionScreen.tsx", "utf8");
const settings = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");

assert.match(screen, /t\("subscription\.screenTitle"\)/);
assert.match(screen, /t\("subscription\.packages"\)/);
assert.match(screen, /t\("subscription\.adminActivate"\)/);
assert.match(screen, /plan\.transactionSmsEnabled/);
assert.match(screen, /plan\.prioritySupportEnabled/);
assert.doesNotMatch(screen, /normalized === "PRO"/);
assert.match(settings, /navigation\.navigate\("Subscription"\)/);
assert.match(navigation, /name="Subscription"/);
console.log("Subscription catalog UI routing and purchase boundary passed");
