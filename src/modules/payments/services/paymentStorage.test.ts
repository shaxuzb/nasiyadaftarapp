// @ts-expect-error Node test runner loads the TypeScript module directly.
import { createPaymentStorageCore } from "./paymentStorageCore.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const data = new Map<string, string>();
const storage = {
  getItem: async (key: string) => data.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    data.set(key, value);
  },
  removeItem: async (key: string) => {
    data.delete(key);
  },
};

const uuids = ["uuid-1", "uuid-2", "uuid-3", "uuid-4", "uuid-5"];
let uuidIndex = 0;
let nowIndex = 0;
const core = createPaymentStorageCore({
  storage,
  randomUUID: () => uuids[uuidIndex++] ?? `uuid-${uuidIndex}`,
  nowIso: () => `2026-09-14T12:00:0${nowIndex++}Z`,
});

const first = await core.getOrCreateCheckoutAttempt(7, "subscription", 2);
const retry = await core.getOrCreateCheckoutAttempt(7, "subscription", 2);
assert(first.idempotencyKey === retry.idempotencyKey, "Retry must reuse the same UUID");

const otherProduct = await core.getOrCreateCheckoutAttempt(7, "sms_package", 1);
assert(otherProduct.idempotencyKey !== first.idempotencyKey, "Different product needs its own UUID");

await core.clearCheckoutAttempt(7, "subscription", 2);
const laterPurchase = await core.getOrCreateCheckoutAttempt(7, "subscription", 2);
assert(laterPurchase.idempotencyKey !== first.idempotencyKey, "Resolved attempt must rotate UUID");

const otherUser = await core.getOrCreateCheckoutAttempt(8, "subscription", 2);
assert(otherUser.idempotencyKey !== laterPurchase.idempotencyKey, "Attempts must be user scoped");

await core.savePendingPayment({
  version: 1,
  userId: 7,
  orderId: 15,
  productType: "subscription",
  productId: 2,
  openedExternally: false,
  updatedAt: "2026-09-14T12:05:00Z",
});
const pending = await core.getPendingPayment(7);
assert(pending?.orderId === 15, "Pending order must survive persistence read");

await core.clearPendingPayment(7, 99);
assert((await core.getPendingPayment(7))?.orderId === 15, "Wrong order id must not clear pending payment");
await core.clearPendingPayment(7, 15);
assert((await core.getPendingPayment(7)) === null, "Matching order id must clear pending payment");

await core.savePendingPayment({
  version: 1,
  userId: 7,
  orderId: 16,
  productType: "sms_package",
  productId: 1,
  openedExternally: true,
  updatedAt: "2026-09-14T12:06:00Z",
});
await core.savePendingPayment({
  version: 1,
  userId: 8,
  orderId: 17,
  productType: "subscription",
  productId: 2,
  openedExternally: false,
  updatedAt: "2026-09-14T12:07:00Z",
});

await core.clearPaymentLifecycleForUser(7);
assert((await core.getPendingPayment(7)) === null, "User cleanup must clear pending payment");
assert((await core.getPendingPayment(8))?.orderId === 17, "User cleanup must not clear another user");
const user8Retry = await core.getOrCreateCheckoutAttempt(8, "subscription", 2);
assert(user8Retry.idempotencyKey === otherUser.idempotencyKey, "Other user attempt must remain intact");

console.log("Payment storage tests passed");
