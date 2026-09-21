const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (path) => fs.readFileSync(path, "utf8");

const types = read("src/bottom-sheet/types.ts");
const registry = read("src/bottom-sheet/registry.ts");
const security = read("src/screens/AccountSecurityScreen.tsx");
assert.doesNotMatch(types, /passwordChange/);
assert.doesNotMatch(registry, /passwordChange/);
assert.doesNotMatch(security, /openSheet\("passwordChange"/);
assert.doesNotMatch(security, /security\.passwordChange/);
assert.match(security, /security\.providersSection/);

console.log("Password change bottom sheet contract passed");
