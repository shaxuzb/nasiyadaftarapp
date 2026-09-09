const assert = require("node:assert/strict");
const fs = require("node:fs");

const filename = "src/screens/CustomerDetailScreen.tsx";
const source = fs.readFileSync(filename, "utf8");

assert.match(
  source,
  /Boshqa tashkilotlarda qora ro'yxatda/,
  "Customer detail must show a compact cross-organization blacklist badge",
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
