// @ts-ignore Standalone Node test imports the TypeScript module directly.
import { getPlanPurchaseStep, shouldCancelBeforePlanPurchase } from "./planPurchase.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

assert(
  shouldCancelBeforePlanPurchase(
    { planCode: "STANDARD", cancellationRequestedAt: null },
    { code: "PREMIUM" },
  ),
  "Switching between different paid plans must cancel the current plan first",
);

assert(
  shouldCancelBeforePlanPurchase(
    { planCode: "STANDARD", cancellationRequestedAt: null },
    { code: "STANDARD" },
  ),
  "A paid subscription must be cancelled before any paid-plan purchase",
);

assert(
  getPlanPurchaseStep(
    { planCode: "PREMIUM", cancellationRequestedAt: null },
    { code: "STANDARD" },
  ) === "cancel-current",
  "Selecting a paid plan from an active paid plan must open cancellation first",
);

assert(
  getPlanPurchaseStep(
    { planCode: "FREE", cancellationRequestedAt: null },
    { code: "STANDARD" },
  ) === "payment",
  "Selecting a paid plan from FREE must open payment directly",
);

assert(
  !shouldCancelBeforePlanPurchase(
    { planCode: "FREE", cancellationRequestedAt: null },
    { code: "STANDARD" },
  ),
  "Moving from FREE must not call paid-plan cancellation",
);

assert(
  !shouldCancelBeforePlanPurchase(
    { planCode: "STANDARD", cancellationRequestedAt: "2026-09-18T10:00:00Z" },
    { code: "PREMIUM" },
  ),
  "A plan with an existing cancellation request must not be cancelled twice",
);

console.log("Subscription plan transition tests passed");
