import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  getCurrentSubscription,
  getSmsPackages,
  getSubscriptionPlans,
} from "../services/subscriptionService";

export function useCurrentSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscriptionCurrent(user?.id ?? "anonymous"),
    queryFn: ({ signal }) => getCurrentSubscription(signal),
    enabled: Boolean(user),
    initialData: user?.subscription,
    staleTime: 60_000,
  });
}

export function useSubscriptionPlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: ({ signal }) => getSubscriptionPlans(signal),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });
}

export function useSmsPackages() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.subscriptionSmsPackages(),
    queryFn: ({ signal }) => getSmsPackages(signal),
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
  });
}
