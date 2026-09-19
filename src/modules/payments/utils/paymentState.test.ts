// @ts-expect-error Node test runner loads the TypeScript module directly.
import * as paymentState from "./paymentState.ts";

const { isPaymentFulfilled, isPaymentTerminal, shouldPersistPendingPayment } =
  paymentState;

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
assert(
  !isPaymentTerminal({ status: "holding", isFulfilled: false }),
  "Holding payment must not be terminal",
);
assert(
  shouldPersistPendingPayment({ status: "holding", isFulfilled: false }),
  "Holding payment must remain persisted",
);
assert(
  isPaymentTerminal({ status: "refunded", isFulfilled: false }),
  "Refunded payment must be terminal",
);
assert(
  !shouldPersistPendingPayment({ status: "refunded", isFulfilled: false }),
  "Refunded payment must not remain persisted",
);

console.log("Payment state tests passed");
