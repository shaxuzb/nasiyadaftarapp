import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getPlanTaglineKey } from "./planTagline.ts";

assert.equal(getPlanTaglineKey("FREE"), "subscription.taglineFree");
assert.equal(getPlanTaglineKey("STANDARD"), "subscription.taglineStandard");
assert.equal(getPlanTaglineKey("PREMIUM"), "subscription.taglinePremium");

/* The server's own spelling of a code is still the same plan. */

assert.equal(getPlanTaglineKey(" premium "), "subscription.taglinePremium");
assert.equal(getPlanTaglineKey("Standard"), "subscription.taglineStandard");

/* A plan the app has no wording for: none is invented. */

for (const code of ["PRO", "", "  ", null, undefined]) {
  assert.equal(getPlanTaglineKey(code), null, String(code));
}

console.log("Plan tagline tests passed");
