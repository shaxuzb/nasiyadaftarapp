const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("src/screens/SubscriptionScreen.tsx", "utf8");
const settings = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");
const navigation = fs.readFileSync("src/navigation/index.tsx", "utf8");

assert.match(screen, /Tariflar va limitlar/);
assert.match(screen, /SMS paketlar/);
assert.match(screen, /Admin orqali faollashtirish/);
assert.match(settings, /navigation\.navigate\("Subscription"\)/);
assert.match(navigation, /name="Subscription"/);
console.log("Subscription catalog UI routing and purchase boundary passed");
