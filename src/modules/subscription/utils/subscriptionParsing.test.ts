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

const apiPlans = parseSubscriptionPlans([
  { id: 1, code: "FREE", name: "Bepul", price: 0, monthlySmsLimit: 3,
    presentation: { icon: "box", badge: null, features: [
      { key: "organizations", text: "1 ta tashkilot", icon: "building" },
      { key: "sms", text: "3 ta SMS / 30 kun", icon: "mail" },
      { key: "telegramBot", text: "Telegramda audit va kunlik hisobot", icon: "telegram" },
    ] } },
  { id: 2, code: "STANDARD", name: "Standard", price: 5,
    presentation: { icon: "box", badge: null, features: [
      { key: "organizations", text: "Cheksiz tashkilot", icon: "building" },
      { key: "sms", text: "100 ta SMS / 30 kun", icon: "mail" },
    ] } },
]);
assert(apiPlans[0].presentation.features[1].key === "sms", "API feature key retained");
assert(apiPlans[0].monthlySmsLimit === 3, "FREE SMS limit exactly as backend");
assert(apiPlans[1].price === 5, "STANDARD price retained without invented conversion");
