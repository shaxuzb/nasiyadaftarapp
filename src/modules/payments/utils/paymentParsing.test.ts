// @ts-expect-error Node test runner loads the TypeScript module directly.
import { parsePaymentOrder, parsePaymentOrders } from "./paymentParsing.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function expectThrow(run: () => unknown, message: string) {
  let threw = false;
  try {
    run();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

const sample = {
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
  externalId: "a35b9f",
  invoiceId: "invoice-id",
  accountNumber: "EX000001",
  provider: null,
  paymentUrl: "https://pay.example/15",
  paymentLinks: { payme: "https://payme.example/15" },
  createdDate: "2026-09-14T12:00:00",
  updatedDate: "2026-09-14T12:00:01",
  paidDate: null,
  fulfilledDate: null,
  isFulfilled: false,
};

const order = parsePaymentOrder(sample);
assert(order.id === 15, "Order id must be preserved");
assert(order.productType === "subscription", "Product type must be preserved");
assert(order.status === "pending", "Known status must be preserved");
assert(order.paymentLinks.payme === sample.paymentLinks.payme, "Payme link must be preserved");

const nullable = parsePaymentOrder({
  ...sample,
  remoteStatus: null,
  externalId: null,
  invoiceId: null,
  accountNumber: null,
  provider: null,
  paymentUrl: null,
  paymentLinks: { payme: null },
  updatedDate: null,
  paidDate: null,
  fulfilledDate: null,
});
assert(nullable.paymentUrl === null, "Nullable payment URL must remain null");
assert(nullable.provider === null, "Nullable provider must remain null");

const history = parsePaymentOrders([sample, { ...sample, id: 16, productType: "sms_package", productId: 1 }]);
assert(history.length === 2, "History array must parse all valid orders");

expectThrow(() => parsePaymentOrder({ ...sample, id: 0 }), "Zero order id must fail");
expectThrow(() => parsePaymentOrder({ ...sample, productId: -1 }), "Negative product id must fail");
expectThrow(() => parsePaymentOrder({ ...sample, productType: "unknown" }), "Unknown product type must fail");
expectThrow(() => parsePaymentOrder({ ...sample, status: "unknown" }), "Unknown status must fail");
expectThrow(() => parsePaymentOrder({ ...sample, amount: -1 }), "Negative amount must fail");
expectThrow(() => parsePaymentOrder({ ...sample, amountTiyin: -1 }), "Negative tiyin amount must fail");
expectThrow(() => parsePaymentOrder({ ...sample, isFulfilled: "true" }), "Non-boolean fulfillment flag must fail");
expectThrow(() => parsePaymentOrders([sample, { ...sample, id: 0 }]), "Malformed history entry must fail the response");

console.log("Payment parsing tests passed");
