const assert = require("node:assert/strict");
const fs = require("node:fs");

const auth = fs.readFileSync("src/context/AuthContext.tsx", "utf8");
const deletion = fs.readFileSync(
  "src/modules/account/components/DeleteAccountSection.tsx",
  "utf8",
);

assert.match(auth, /clearPaymentLifecycleForUser/);
assert.match(auth, /queryKeys\.paymentsRoot\(\)/);
assert.match(auth, /user\?\.id\s*\?\?\s*session\?\.user\.id/);
assert.match(deletion, /clearPaymentLifecycleForUser/);
assert.match(deletion, /userId/);
assert.match(deletion, /deleteMyAccount\(\)/);

console.log("Payment lifecycle cleanup contract passed");
