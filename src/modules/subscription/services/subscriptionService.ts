import { apiClient } from "../../../services/axiosService";
import type {
  SmsPackage,
  SubscriptionPlan,
  CurrentSubscription,
} from "../types";
import {
  parseCurrentSubscription,
  parseSmsPackages,
  parseSubscriptionPlans,
} from "../utils/subscriptionParsing";

export async function getCurrentSubscription(
  signal?: AbortSignal,
): Promise<CurrentSubscription> {
  const response = await apiClient.get("/subscriptions/current", { signal });
  return parseCurrentSubscription(response.data);
}

export async function cancelCurrentSubscription(): Promise<CurrentSubscription> {
  const response = await apiClient.post(
    "/subscriptions/current/cancel",
    undefined,
  );
  return parseCurrentSubscription(response.data);
}

export async function getSubscriptionPlans(
  signal?: AbortSignal,
): Promise<SubscriptionPlan[]> {
  const response = await apiClient.get("/subscriptions/plans", { signal });
  return parseSubscriptionPlans(response.data);
}

export async function getSmsPackages(
  signal?: AbortSignal,
): Promise<SmsPackage[]> {
  const response = await apiClient.get("/subscriptions/sms-packages", {
    signal,
  });
  return parseSmsPackages(response.data);
}
