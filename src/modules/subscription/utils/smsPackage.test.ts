import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { getPricePerSms } from "./smsPackage.ts";

/* A bigger package costing less per SMS is the point of showing this. */

assert.equal(getPricePerSms({ price: 8000, smsCount: 100 }), 80);
assert.equal(getPricePerSms({ price: 35000, smsCount: 500 }), 70);

/* Rounded to whole so'm. */

assert.equal(getPricePerSms({ price: 5000, smsCount: 60 }), 83);
assert.equal(getPricePerSms({ price: 5050, smsCount: 100 }), 51);

/* The discounted price is the one that counts, since it is what is charged. */

assert.equal(getPricePerSms({ price: 8000, smsCount: 100, oldPrice: 10000 } as never), 80);

/* Nothing sensible to show. */

for (const item of [
  { price: 0, smsCount: 100 },
  { price: 8000, smsCount: 0 },
  { price: -1, smsCount: 100 },
  { price: 8000, smsCount: -5 },
  { price: Number.NaN, smsCount: 100 },
  { price: 8000, smsCount: Number.POSITIVE_INFINITY },
  { price: 10, smsCount: 1000 },
]) {
  assert.equal(getPricePerSms(item), null, JSON.stringify(item));
}

console.log("SMS package price-per-SMS tests passed");
