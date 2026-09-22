// @ts-ignore Standalone Node test imports the TypeScript module directly.
import { getPlanPurchaseAvailability } from "./planPurchase.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

// Upgrades and first purchases go straight to payment.
assert(
  getPlanPurchaseAvailability({ planCode: "FREE" }, { code: "STANDARD" })
    .allowed,
  "FREE to STANDARD must be allowed",
);
assert(
  getPlanPurchaseAvailability({ planCode: "FREE" }, { code: "PREMIUM" })
    .allowed,
  "FREE to PREMIUM must be allowed",
);
assert(
  getPlanPurchaseAvailability({ planCode: "STANDARD" }, { code: "PREMIUM" })
    .allowed,
  "STANDARD to PREMIUM must be allowed",
);
assert(
  getPlanPurchaseAvailability(null, { code: "PREMIUM" }).allowed,
  "A user without a subscription must be able to buy any plan",
);

// Buying the current plan again extends it.
assert(
  getPlanPurchaseAvailability({ planCode: "STANDARD" }, { code: "STANDARD" })
    .allowed,
  "Renewing the same plan must be allowed",
);
assert(
  getPlanPurchaseAvailability({ planCode: "PREMIUM" }, { code: "PREMIUM" })
    .allowed,
  "Renewing PREMIUM must be allowed",
);

// Downgrades wait for the paid period to end.
const premiumToStandard = getPlanPurchaseAvailability(
  { planCode: "PREMIUM" },
  { code: "STANDARD" },
);
assert(
  !premiumToStandard.allowed,
  "PREMIUM to STANDARD must be blocked before the period ends",
);
assert(
  !premiumToStandard.allowed && premiumToStandard.reason === "downgrade",
  "A blocked downgrade must report the downgrade reason",
);
assert(
  !getPlanPurchaseAvailability({ planCode: "PREMIUM" }, { code: "FREE" })
    .allowed,
  "PREMIUM to FREE must be blocked",
);
assert(
  !getPlanPurchaseAvailability({ planCode: "STANDARD" }, { code: "FREE" })
    .allowed,
  "STANDARD to FREE must be blocked",
);

// Casing and padding from the API must not change the decision.
assert(
  !getPlanPurchaseAvailability({ planCode: " premium " }, { code: "standard" })
    .allowed,
  "Plan codes must be compared case-insensitively and trimmed",
);

// An unknown plan code has no rank, so the server decides.
assert(
  getPlanPurchaseAvailability({ planCode: "PREMIUM" }, { code: "BUSINESS" })
    .allowed,
  "An unranked target plan must be left to the server",
);
assert(
  getPlanPurchaseAvailability({ planCode: "BUSINESS" }, { code: "STANDARD" })
    .allowed,
  "An unranked current plan must be left to the server",
);

console.log("Subscription plan transition tests passed");
