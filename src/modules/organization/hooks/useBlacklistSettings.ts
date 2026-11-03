import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  getCurrentOrganization,
  updateBlacklistSettings,
} from "../services/organizationService";

export function useCurrentOrganization() {
  const { user, currentOrganization } = useAuth();
  const { scope, enabled } = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );
  return useQuery({
    queryKey: queryKeys.currentOrganization(scope),
    queryFn: ({ signal }) => getCurrentOrganization(signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateBlacklistSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateBlacklistSettings,
    // The root covers the current organization too; invalidating that first
    // fetched it twice in a row.
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizationsRoot(),
      }),
  });
}
