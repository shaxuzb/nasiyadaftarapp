const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "src/modules/account/context/AccountSecurityContext.tsx",
  "utf8",
);

assert.match(source, /useAppLock/);
assert.match(source, /isResolving\s*\|\|\s*setupRequired\s*\|\|\s*isLocked/);
assert.match(source, /!isResolving.*!setupRequired.*!isLocked/);
console.log("Phone verification waits until PIN gate is cleared");
