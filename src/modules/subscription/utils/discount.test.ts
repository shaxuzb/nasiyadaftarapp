import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { formatDiscountPercent, getPriceDiscount } from "./discount.ts";

/* The documented case: 49 900 struck through, 39 900, and a -20% badge. */

assert.deepEqual(
  getPriceDiscount({ price: 39900, oldPrice: 49900, discountPercent: 20 }),
  { oldPrice: 49900, percent: 20 },
);
assert.equal(formatDiscountPercent(20), "-20%");

/* No old price: the price is shown as it always was. */

assert.equal(getPriceDiscount({ price: 39900, oldPrice: null, discountPercent: null }), null);
assert.equal(getPriceDiscount({ price: 39900 }), null);
assert.equal(
  getPriceDiscount({ price: 39900, oldPrice: null, discountPercent: 20 }),
  null,
  "A percentage without an old price has nothing to strike through",
);

/* An old price without a percentage: struck through, no badge, nothing computed. */

assert.deepEqual(getPriceDiscount({ price: 39900, oldPrice: 49900, discountPercent: null }), {
  oldPrice: 49900,
  percent: null,
});
assert.deepEqual(getPriceDiscount({ price: 39900, oldPrice: 49900 }), {
  oldPrice: 49900,
  percent: null,
});

/* An old price that is not higher is not a discount. */

for (const oldPrice of [39900, 30000, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
  assert.equal(
    getPriceDiscount({ price: 39900, oldPrice, discountPercent: 20 }),
    null,
    `oldPrice ${oldPrice}`,
  );
}

/* A percentage that makes no sense is dropped; the struck price stays. */

for (const discountPercent of [0, -10, 101, Number.NaN]) {
  assert.deepEqual(
    getPriceDiscount({ price: 39900, oldPrice: 49900, discountPercent }),
    { oldPrice: 49900, percent: null },
    `discountPercent ${discountPercent}`,
  );
}

/* A plan made free by a promotion. */

assert.deepEqual(getPriceDiscount({ price: 0, oldPrice: 49900, discountPercent: 100 }), {
  oldPrice: 49900,
  percent: 100,
});

/* Fractions are kept to one decimal, without a trailing zero. */

assert.equal(formatDiscountPercent(12.5), "-12.5%");
assert.equal(formatDiscountPercent(33.333), "-33.3%");
assert.equal(formatDiscountPercent(20.0), "-20%");
assert.equal(formatDiscountPercent(100), "-100%");

console.log("Price discount tests passed");
