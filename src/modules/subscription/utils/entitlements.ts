import type { AuthUser } from "../../auth/types";
import type { CurrentSubscription } from "../types";

export type SubscriptionCapability = "telegram" | "blacklist" | "sms";

export function canCreateOrganization(
  subscription: CurrentSubscription | undefined,
  count: number,
): boolean {
  if (!subscription) return true;
  if (
    subscription.unlimitedOrganizations ||
    subscription.maxOrganizations === null
  ) {
    return true;
  }
  return count < Math.max(0, subscription.maxOrganizations);
}

export function getOrganizationLimitLabel(
  subscription: CurrentSubscription | undefined,
  count: number,
): string {
  if (
    !subscription ||
    subscription.unlimitedOrganizations ||
    subscription.maxOrganizations === null
  ) {
    return `${count}/cheksiz`;
  }
  return `${count}/${subscription.maxOrganizations}`;
}

export function hasSubscriptionCapability(
  user: Pick<AuthUser, "subscription"> | null | undefined,
  capability: SubscriptionCapability,
): boolean {
  const subscription = user?.subscription;
  if (!subscription) return true;
  if (capability === "telegram") return subscription.telegramBotEnabled;
  if (capability === "blacklist") return subscription.blacklistEnabled;
  return (
    subscription.sms.totalRemaining === null ||
    subscription.sms.totalRemaining > 0
  );
}
