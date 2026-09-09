import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  getCurrentOrganization,
  updateBlacklistSettings,
} from "../services/organizationService";

export function useCurrentOrganization() {
  const { user } = useAuth();
  const scope = user?.organizationId ?? user?.id ?? "anonymous";
  return useQuery({
    queryKey: queryKeys.currentOrganization(scope),
    queryFn: ({ signal }) => getCurrentOrganization(signal),
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}

export function useUpdateBlacklistSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const scope = user?.organizationId ?? user?.id ?? "anonymous";
  return useMutation({
    mutationFn: updateBlacklistSettings,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.currentOrganization(scope),
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organizationsRoot(),
      });
    },
  });
}
