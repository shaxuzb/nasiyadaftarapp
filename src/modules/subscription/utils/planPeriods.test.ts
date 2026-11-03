import assert from "node:assert/strict";
import {
  DEFAULT_PERIOD_MONTHS,
  getPlanPeriod,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./planPeriods.ts";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { parsePlanPeriods } from "./subscriptionParsing.ts";

const fallback = { price: 10000, oldPrice: null, discountPercent: null };

/* The documented answer. */

const documented = parsePlanPeriods(
  [
    { months: 1, price: 10000, oldPrice: null, discountPercent: null, monthlyPrice: 10000 },
    { months: 3, price: 27000, oldPrice: 30000, discountPercent: 10, monthlyPrice: 9000 },
    { months: 6, price: 48000, oldPrice: 60000, discountPercent: 20, monthlyPrice: 8000 },
  ],
  fallback,
);
assert.deepEqual(documented, [
  { months: 1, price: 10000, oldPrice: null, discountPercent: null, monthlyPrice: 10000 },
  { months: 3, price: 27000, oldPrice: 30000, discountPercent: 10, monthlyPrice: 9000 },
  { months: 6, price: 48000, oldPrice: 60000, discountPercent: 20, monthlyPrice: 8000 },
]);

/* An older server sends no terms: one month at the plan's own price. */

for (const raw of [undefined, null, [], "periods", {}]) {
  assert.deepEqual(parsePlanPeriods(raw, { price: 49900, oldPrice: 60000, discountPercent: 17 }), [
    { months: 1, price: 49900, oldPrice: 60000, discountPercent: 17, monthlyPrice: 49900 },
  ]);
}

/* Bad entries are skipped, the rest sorted; a missing monthly price is worked out. */

assert.deepEqual(
  parsePlanPeriods(
    [
      { months: 6, price: 48000 },
      { months: 0, price: 1 },
      { months: 2.5, price: 1 },
      { months: 3, price: -1 },
      { months: 3, price: "27000", oldPrice: 0, discountPercent: "" },
      { months: 3, price: 99999 },
      null,
      "1",
    ],
    fallback,
  ),
  [
    { months: 3, price: 27000, oldPrice: null, discountPercent: null, monthlyPrice: 9000 },
    { months: 6, price: 48000, oldPrice: null, discountPercent: null, monthlyPrice: 8000 },
  ],
);

/* Picking a term. */

assert.equal(DEFAULT_PERIOD_MONTHS, 1);
assert.equal(getPlanPeriod(documented, 3)?.price, 27000);
assert.equal(getPlanPeriod(documented, null)?.months, 1, "No choice: one month");
assert.equal(getPlanPeriod(documented, 12)?.months, 1, "A term not sold: one month");
assert.equal(
  getPlanPeriod([{ months: 3, price: 27000, oldPrice: null, discountPercent: null, monthlyPrice: 9000 }], null)?.months,
  3,
  "No one-month term at all: the first one there is",
);
assert.equal(getPlanPeriod([], 1), null);

console.log("Plan period tests passed");
