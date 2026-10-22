export type SubscriptionUpgradeReason =
  | "sms-limit"
  // The user asked to buy SMS: the package list and nothing else.
  | "sms-packages"
  | "auto-reminder"
  | "telegram"
  | "organization-limit"
  | "blacklist";

export type PaidPlanCode = "STANDARD" | "PREMIUM";

interface SubscriptionSnapshot {
  planCode?: string | null;
}

export interface SubscriptionUpgradeOptions {
  showPlans: boolean;
  showPackages: boolean;
  recommendedPlanCode: PaidPlanCode;
}

export function normalizePlanCode(planCode?: string | null) {
  return planCode?.trim().toUpperCase() ?? "FREE";
}

export function isPaidPlanCode(planCode?: string | null) {
  const normalized = normalizePlanCode(planCode);
  return normalized === "STANDARD" || normalized === "PREMIUM";
}

export function getSubscriptionUpgradeOptions(
  subscription: SubscriptionSnapshot | null | undefined,
  reason: SubscriptionUpgradeReason,
): SubscriptionUpgradeOptions {
  const currentPlanCode = normalizePlanCode(subscription?.planCode);
  const isPaid = isPaidPlanCode(currentPlanCode);
  if (reason === "auto-reminder") {
    return { showPlans: currentPlanCode !== "PREMIUM", showPackages: false, recommendedPlanCode: "PREMIUM" };
  }
  if (reason === "sms-packages") {
    return { showPlans: false, showPackages: true, recommendedPlanCode: "PREMIUM" };
  }
  return {
    showPlans: reason === "sms-limit" ? currentPlanCode !== "PREMIUM" : !isPaid,
    showPackages: reason === "sms-limit",
    recommendedPlanCode: "PREMIUM",
  };
}
