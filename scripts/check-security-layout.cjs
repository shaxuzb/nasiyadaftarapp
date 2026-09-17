const assert = require("node:assert/strict");
const fs = require("node:fs");

const security = fs.readFileSync("src/screens/AccountSecurityScreen.tsx", "utf8");
const uz = fs.readFileSync("src/i18n/translations/uz.ts", "utf8");
const ru = fs.readFileSync("src/i18n/translations/ru.ts", "utf8");

assert.match(security, /t\("security\.appLockSection"\)/);
assert.match(security, /openSheet\("passwordChange",\s*\{\}\)/);
assert.match(uz, /appLockSection:/);
assert.match(ru, /appLockSection:/);

console.log("Security screen layout contract passed");
