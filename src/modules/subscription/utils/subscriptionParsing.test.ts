// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { parseCurrentSubscription, parseSubscriptionPlans } from "./subscriptionParsing.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const parsed = parseCurrentSubscription({
  subscriptionId: 13,
  planId: 2,
  planCode: "STANDARD",
  cancellationRequestedAt: "2026-09-18T10:00:00Z",
  sms: { monthlyLimit: 100, monthlyRemaining: 100, monthlyUsed: 0 },
});

assert(
  parsed.cancellationRequestedAt === "2026-09-18T10:00:00Z",
  "Cancellation request timestamp must be preserved",
);

const withoutCancellation = parseCurrentSubscription({
  planCode: "FREE",
  cancellationRequestedAt: null,
});
assert(
  withoutCancellation.cancellationRequestedAt === null,
  "Missing cancellation request must remain nullable",
);

console.log("Subscription response parsing tests passed");

const parsedPlans = parseSubscriptionPlans([{ id: 2, code: "STANDARD", name: "Standard", price: 49000,
 description: "Server-defined description", monthlySmsLimit: 70,
 presentation: { icon: "rocket-outline", badge: "Popular", features: [
   { text: "Mijozlar boti", icon: "paper-plane-outline" }, "Hisobotlar",
 ] } }]);
assert(parsedPlans[0].description === "Server-defined description", "API description");
assert(parsedPlans[0].presentation.badge === "Popular", "API badge");
assert(parsedPlans[0].presentation.features.length === 2, "API features");
