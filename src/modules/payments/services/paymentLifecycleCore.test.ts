// @ts-expect-error Node test runner loads the TypeScript module directly.
import { createPaymentLifecycleCore } from "./paymentLifecycleCore.ts";
import type { PaymentOrder } from "../types";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const baseOrder: PaymentOrder = {
  id: 15,
  productType: "subscription",
  productId: 2,
  productCode: "STANDARD",
  productName: "Standard",
  amount: 29900,
  amountTiyin: 2990000,
  currency: "UZS",
  status: "pending",
  remoteStatus: "pending",
  externalId: "external",
  invoiceId: "invoice",
  accountNumber: "EX000001",
  provider: null,
  providerTransactionId: null,
  paymentServiceTransactionId: null,
  paymentUrl: "https://pay.example/15",
  paymentLinks: { payme: null },
  createdDate: "2026-09-14T12:00:00",
  updatedDate: null,
  paidDate: null,
  fulfilledDate: null,
  reversedDate: null,
  isFulfilled: false,
};

const events: string[] = [];
let createShouldFail = false;
const syncControl: {
  resolve?: (value: PaymentOrder) => void;
} = {};
let syncCalls = 0;
const attempt = {
  version: 1 as const,
  userId: 7,
  productType: "subscription" as const,
  productId: 2,
  idempotencyKey: "same-uuid",
  createdAt: "2026-09-14T12:00:00Z",
};

const core = createPaymentLifecycleCore({
  getOrCreateCheckoutAttempt: async () => {
    events.push("attempt:get");
    return attempt;
  },
  clearCheckoutAttempt: async () => {
    events.push("attempt:clear");
  },
  savePendingPayment: async (reference) => {
    events.push(`pending:save:${reference.orderId}`);
  },
  clearPendingPayment: async (_userId, orderId) => {
    events.push(`pending:clear:${orderId ?? "all"}`);
  },
  createSubscriptionPayment: async (_productId, idempotencyKey) => {
    events.push(`create:subscription:${idempotencyKey}`);
    if (createShouldFail) throw new Error("timeout");
    return baseOrder;
  },
  createSmsPackagePayment: async () => {
    throw new Error("not used");
  },
  syncPayment: async () => {
    syncCalls += 1;
    events.push("sync");
    return await new Promise<PaymentOrder>((resolve) => {
      syncControl.resolve = resolve;
    });
  },
  cancelPayment: async () => {
    events.push("cancel");
    return { ...baseOrder, status: "cancelled" };
  },
  getCheckoutUrl: (order) => order.paymentUrl,
  shouldPersistPending: (order) =>
    order.status === "pending" ||
    (order.status === "paid" && !order.isFulfilled),
  isFulfilled: (order) => order.status === "paid" && order.isFulfilled,
  onCanonicalOrder: async (order) => {
    events.push(`canonical:${order.status}:${order.isFulfilled}`);
  },
  onFulfilled: async () => {
    events.push("fulfilled");
  },
});

const started = await core.startCheckout({
  userId: 7,
  productType: "subscription",
  productId: 2,
});
assert(started.order.id === 15, "Checkout must return canonical order");
assert(
  started.checkoutUrl === baseOrder.paymentUrl,
  "Checkout must return backend URL",
);
assert(
  events.indexOf("attempt:clear") >
    events.indexOf("create:subscription:same-uuid"),
  "Attempt clears only after valid order",
);
assert(
  events.includes("pending:save:15"),
  "Recoverable order must persist pending reference",
);

createShouldFail = true;
const beforeFailure = events.length;
let failed = false;
try {
  await core.startCheckout({
    userId: 7,
    productType: "subscription",
    productId: 2,
  });
} catch {
  failed = true;
}
assert(failed, "Checkout network failure must propagate");
assert(
  !events.slice(beforeFailure).includes("attempt:clear"),
  "Failed checkout must preserve attempt key",
);
createShouldFail = false;

const syncOne = core.syncOrder(7, 15);
const syncTwo = core.syncOrder(7, 15);
assert(syncCalls === 1, "Concurrent manual/foreground sync must deduplicate");
const resolveSync = syncControl.resolve;
if (!resolveSync) {
  throw new Error("Sync resolver must be registered before resolving");
}
resolveSync({ ...baseOrder, status: "paid", isFulfilled: false });
const [syncedOne, syncedTwo] = await Promise.all([syncOne, syncTwo]);
assert(
  syncedOne.status === "paid" && syncedTwo.status === "paid",
  "Both sync callers receive same canonical result",
);
assert(
  !events.includes("fulfilled"),
  "Paid but unfulfilled must not refresh entitlement as success",
);

const recoveryEvents: string[] = [];
let recoverySyncCalls = 0;
const recoveryCore = createPaymentLifecycleCore({
  getOrCreateCheckoutAttempt: async () => attempt,
  clearCheckoutAttempt: async () => undefined,
  savePendingPayment: async () => undefined,
  clearPendingPayment: async () => undefined,
  createSubscriptionPayment: async () => baseOrder,
  createSmsPackagePayment: async () => baseOrder,
  syncPayment: async () => {
    recoverySyncCalls += 1;
    recoveryEvents.push(`sync:${recoverySyncCalls}`);
    return { ...baseOrder, status: "paid", isFulfilled: false };
  },
  cancelPayment: async () => baseOrder,
  cancelCurrentSubscription: async () => {
    recoveryEvents.push("cancel-current-subscription");
  },
  onSubscriptionCancellation: async () => {
    recoveryEvents.push("refresh-current-subscription");
  },
  getCheckoutUrl: () => null,
  shouldPersistPending: () => true,
  isFulfilled: () => false,
  onCanonicalOrder: async () => undefined,
  onFulfilled: async () => undefined,
});

await recoveryCore.syncOrder(7, 15);
assert(
  recoverySyncCalls === 2,
  "Paid but unfulfilled subscription must be synced again after cancellation",
);
assert(
  recoveryEvents.join(",") ===
    "sync:1,cancel-current-subscription,refresh-current-subscription,sync:2",
  "Subscription cancellation recovery must happen before the second sync",
);

await core.cancelOrder(7, 15);
const cancelIndex = events.lastIndexOf("cancel");
assert(cancelIndex >= 0, "Cancel must call the backend endpoint");
assert(!events.includes("get"), "Cancel response must be used as canonical order");
assert(
  events.includes("pending:clear:15"),
  "Terminal canonical order must clear pending reference",
);

const fulfilledEvents: string[] = [];
const fulfilledCore = createPaymentLifecycleCore({
  getOrCreateCheckoutAttempt: async () => attempt,
  clearCheckoutAttempt: async () => undefined,
  savePendingPayment: async () => undefined,
  clearPendingPayment: async () => {
    fulfilledEvents.push("clear");
  },
  createSubscriptionPayment: async () => ({
    ...baseOrder,
    status: "paid",
    isFulfilled: true,
  }),
  createSmsPackagePayment: async () => {
    throw new Error("not used");
  },
  syncPayment: async () => baseOrder,
  cancelPayment: async () => baseOrder,
  getCheckoutUrl: () => null,
  shouldPersistPending: () => false,
  isFulfilled: () => true,
  onCanonicalOrder: async () => {
    fulfilledEvents.push("canonical");
  },
  onFulfilled: async () => {
    fulfilledEvents.push("fulfilled");
  },
});
await fulfilledCore.startCheckout({
  userId: 7,
  productType: "subscription",
  productId: 2,
});
assert(
  fulfilledEvents.join(",") === "clear,canonical,fulfilled",
  "Fulfilled order must clear pending, update canonical cache, then refresh entitlement",
);

console.log("Payment lifecycle orchestration tests passed");
