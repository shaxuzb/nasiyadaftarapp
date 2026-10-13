const assert = require("node:assert/strict");
const fs = require("node:fs");

const filename = "src/screens/CustomerDetailScreen.tsx";
const source = fs.readFileSync(filename, "utf8");

assert.match(
  source,
  /\{t\("customers\.blacklistBadge"\)\}/,
  "Customer detail must show the same plain 'blacklisted' wording as everywhere else",
);
assert.doesNotMatch(
  source,
  /otherOrganizationsBlacklist/,
  "The badge must not say 'in other organizations'",
);
assert.match(
  source,
  /styles\.blacklistBadge/,
  "Blacklist status must be rendered as a header badge",
);
assert.match(
  source,
  /showBlacklistBadge/,
  "Blacklist badge visibility must be derived from blacklist data",
);
assert.doesNotMatch(
  source,
  /blacklistCard|blacklistHeader|organizationTags/,
  "The standalone blacklist card must be removed",
);
assert.match(
  source,
  /borderColor: theme\.tabBarBorder/,
  "Detail separators must use the more visible system border token",
);

console.log(
  "Customer detail blacklist badge and border contrast checks passed",
);
