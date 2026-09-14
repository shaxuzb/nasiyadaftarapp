// @ts-expect-error Node test runner loads the TypeScript module directly.
import { isPaymentFulfilled, isPaymentTerminal, shouldPersistPendingPayment } from "./paymentState.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

assert(
  isPaymentFulfilled({ status: "paid", isFulfilled: true }),
  "Paid + fulfilled must be successful",
);
assert(
  !isPaymentFulfilled({ status: "paid", isFulfilled: false }),
  "Paid but unfulfilled must not claim success",
);
assert(
  !isPaymentTerminal({ status: "paid", isFulfilled: false }),
  "Paid but unfulfilled must remain recoverable",
);
assert(
  shouldPersistPendingPayment({ status: "paid", isFulfilled: false }),
  "Paid but unfulfilled must remain persisted",
);
assert(
  !shouldPersistPendingPayment({ status: "paid", isFulfilled: true }),
  "Fulfilled payment must not remain pending",
);
for (const status of ["cancelled", "failed", "expired"] as const) {
  assert(
    isPaymentTerminal({ status, isFulfilled: false }),
    `${status} must be terminal`,
  );
  assert(
    !shouldPersistPendingPayment({ status, isFulfilled: false }),
    `${status} must not remain persisted`,
  );
}
assert(
  !isPaymentTerminal({ status: "pending", isFulfilled: false }),
  "Pending payment must not be terminal",
);

console.log("Payment state tests passed");
