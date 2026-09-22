interface CurrentPlanSnapshot {
  planCode?: string | null;
}

interface TargetPlanSnapshot {
  code?: string | null;
}

// FREE < STANDARD < PREMIUM. The plans endpoint exposes no rank field, so the
// order lives here. A code that is not listed has no known rank and is left to
// the server to accept or reject, so adding a plan on the backend never
// silently disables its button in the app.
const PLAN_RANK: Record<string, number> = {
  FREE: 0,
  STANDARD: 1,
  PREMIUM: 2,
};

export type PlanPurchaseBlockedReason = "downgrade";

export type PlanPurchaseAvailability =
  | { allowed: true }
  | { allowed: false; reason: PlanPurchaseBlockedReason };

const ALLOWED: PlanPurchaseAvailability = { allowed: true };

export function normalizePlanCode(planCode?: string | null) {
  return planCode?.trim().toUpperCase() ?? "FREE";
}

export function getPlanPurchaseAvailability(
  current: CurrentPlanSnapshot | null | undefined,
  target: TargetPlanSnapshot,
): PlanPurchaseAvailability {
  const currentRank = PLAN_RANK[normalizePlanCode(current?.planCode)];
  const targetRank = PLAN_RANK[normalizePlanCode(target.code)];

  if (currentRank === undefined || targetRank === undefined) {
    return ALLOWED;
  }

  // A cheaper plan can only start once the paid period runs out, so the server
  // answers this with 409. Reporting it before the request explains the rule
  // instead of letting the user pick a plan that cannot be bought yet.
  if (targetRank < currentRank) {
    return { allowed: false, reason: "downgrade" };
  }

  // Upgrades start immediately and buying the same plan again extends it, so
  // both go straight to payment: the plan no longer has to be cancelled first.
  return ALLOWED;
}
