// @ts-expect-error Node test runner loads the TypeScript module directly.
import { getPaymentCheckoutUrl } from "./paymentUrl.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const base = {
  paymentUrl: "https://primary.example/pay",
  paymentLinks: { payme: "https://fallback.example/pay" },
};

assert(
  getPaymentCheckoutUrl(base) === "https://primary.example/pay",
  "Primary HTTPS paymentUrl must win",
);
assert(
  getPaymentCheckoutUrl({ ...base, paymentUrl: null }) ===
    "https://fallback.example/pay",
  "Payme HTTPS link must be used as fallback",
);
assert(
  getPaymentCheckoutUrl({ ...base, paymentUrl: "http://unsafe.example/pay" }) ===
    "https://fallback.example/pay",
  "HTTP primary URL must be rejected",
);
assert(
  getPaymentCheckoutUrl({ ...base, paymentUrl: "payme://pay" }) ===
    "https://fallback.example/pay",
  "Custom-scheme primary URL must be rejected",
);
assert(
  getPaymentCheckoutUrl({ paymentUrl: "not a url", paymentLinks: { payme: null } }) ===
    null,
  "Malformed and missing checkout URLs must return null",
);
assert(
  getPaymentCheckoutUrl({ paymentUrl: null, paymentLinks: { payme: "http://unsafe.example" } }) ===
    null,
  "Non-HTTPS fallback must be rejected",
);

console.log("Payment URL tests passed");
