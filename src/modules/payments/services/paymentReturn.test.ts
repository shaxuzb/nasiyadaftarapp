import assert from "node:assert/strict";
import {
  awaitPaymentReturn,
  takeAwaitedPaymentReturn,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./paymentReturn.ts";

/* Nobody was sent out: nothing to show on the way back. */

assert.equal(takeAwaitedPaymentReturn(), null);

/* One trip out, one status sheet. */

awaitPaymentReturn(15);
assert.equal(takeAwaitedPaymentReturn(), 15);
assert.equal(takeAwaitedPaymentReturn(), null, "Taking the note clears it");

/* A second payment replaces the first note. */

awaitPaymentReturn(15);
awaitPaymentReturn(16);
assert.equal(takeAwaitedPaymentReturn(), 16);
assert.equal(takeAwaitedPaymentReturn(), null);

/* Not an order id: no note. */

for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
  awaitPaymentReturn(value);
  assert.equal(takeAwaitedPaymentReturn(), null);
}

console.log("Payment return note tests passed");
