import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { isCustomerBlacklisted } from "./blacklist.ts";

assert.equal(isCustomerBlacklisted({}), false, "No flags means no warning");
assert.equal(isCustomerBlacklisted({ isBlacklisted: false }), false);
assert.equal(isCustomerBlacklisted({ isBlacklisted: true }), true);
assert.equal(
  isCustomerBlacklisted({ blacklistedOrganizationCount: 2 }),
  true,
  "Blacklisted in other organizations still warns",
);
assert.equal(
  isCustomerBlacklisted({ blacklistedOrganizations: [{ name: "Do'kon" }] }),
  true,
  "A named organization warns even without a count",
);

console.log("Customer blacklist warning tests passed");
