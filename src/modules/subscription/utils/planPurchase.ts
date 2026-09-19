interface CurrentPlanSnapshot {
  planCode?: string | null;
  cancellationRequestedAt?: string | null;
}

interface TargetPlanSnapshot {
  code?: string | null;
}

export type PlanPurchaseStep = "payment" | "cancel-current";

function normalizePlanCode(planCode?: string | null) {
  return planCode?.trim().toUpperCase() ?? "FREE";
}

function isPaidPlanCode(planCode: string) {
  return planCode === "STANDARD" || planCode === "PREMIUM";
}

export function shouldCancelBeforePlanPurchase(
  current: CurrentPlanSnapshot | null | undefined,
  target: TargetPlanSnapshot,
): boolean {
  if (!current || current.cancellationRequestedAt) return false;

  const currentCode = normalizePlanCode(current.planCode);
  const targetCode = normalizePlanCode(target.code);

  return isPaidPlanCode(currentCode) && isPaidPlanCode(targetCode);
}

export function getPlanPurchaseStep(
  current: CurrentPlanSnapshot | null | undefined,
  target: TargetPlanSnapshot,
): PlanPurchaseStep {
  return shouldCancelBeforePlanPurchase(current, target)
    ? "cancel-current"
    : "payment";
}
