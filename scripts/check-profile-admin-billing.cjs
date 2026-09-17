const assert = require("node:assert/strict");
const fs = require("node:fs");

const screen = fs.readFileSync("src/screens/SettingsScreen.tsx", "utf8");

assert.match(
  screen,
  /user\?\.role\s*===\s*["']Administrator["'][\s\S]*user\?\.roleId\s*===\s*2/,
  "profile must identify administrator accounts using role and roleId",
);
assert.match(
  screen,
  /!isAdministrator[\s\S]*styles\.profilePlanRow/,
  "administrator accounts must not render the profile subscription summary",
);
assert.match(
  screen,
  /!isAdministrator[\s\S]*t\("profile\.planLimits"\)/,
  "administrator accounts must not render the plan and limits menu item",
);
assert.match(
  screen,
  /t\("profile\.paymentHistory"\)[\s\S]*navigation\.navigate\("PaymentHistory"\)/,
  "regular users must have a payment history shortcut in the profile",
);
assert.match(
  screen,
  /!isAdministrator[\s\S]*t\("profile\.paymentHistory"\)/,
  "administrator accounts must not render the payment history shortcut",
);

console.log("Profile administrator billing visibility contract passed");
