const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  "src/modules/account/context/AccountSecurityContext.tsx",
  "utf8",
);

assert.match(source, /requireVerifiedPhone/);
assert.doesNotMatch(
  source,
  /promptedUserIdRef|isGoogleUser|const pinGateCleared/,
);
console.log("Phone verification is requested only by explicit protected actions");
