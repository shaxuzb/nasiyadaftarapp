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