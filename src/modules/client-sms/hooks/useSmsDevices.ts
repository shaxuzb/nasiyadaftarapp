import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { getSmsDevices, claimSmsDevice, deleteSmsDevice } from "../services/smsDevicesService";
function useDeviceScope() {
  const { user, currentOrganization } = useAuth();
  return getOrganizationQueryScope(user?.id, currentOrganization?.id);
}
export function useSmsDevices() {
  const { scope, enabled } = useDeviceScope();
  return useQuery({ queryKey: queryKeys.clientSmsDevices(scope), queryFn: ({ signal }) => getSmsDevices(signal), enabled, staleTime: 30_000 });
}
export function useClaimSmsDevice() {
  const { scope } = useDeviceScope(); const qc = useQueryClient();
  return useMutation({ mutationFn: claimSmsDevice, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientSmsDevices(scope) }) });
}
export function useDeleteSmsDevice() {
  const { scope } = useDeviceScope(); const qc = useQueryClient();
  return useMutation({ mutationFn: deleteSmsDevice, onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientSmsDevices(scope) }) });
}
