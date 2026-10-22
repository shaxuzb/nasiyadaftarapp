import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { getSmsDevices, claimSmsDevice, deleteSmsDevice } from "../services/smsDevicesService";
import { getSmsProvider, updateSmsProvider } from "../services/smsProviderService";
import type { SmsDevice } from "../types/devices";
import type { SmsProviderCode } from "../types/provider";

function useSmsDeviceScope() {
  const { user, currentOrganization } = useAuth();
  return getOrganizationQueryScope(user?.id, currentOrganization?.id);
}

export function useSmsDevices() {
  const { scope, enabled } = useSmsDeviceScope();
  return useQuery({
    queryKey: queryKeys.clientSmsDevices(scope),
    queryFn: ({ signal }) => getSmsDevices(signal),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useSmsProvider() {
  const { scope, enabled } = useSmsDeviceScope();
  return useQuery({
    queryKey: queryKeys.clientSmsProvider(scope),
    queryFn: ({ signal }) => getSmsProvider(signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useUpdateSmsProvider() {
  const qc = useQueryClient();
  const { scope } = useSmsDeviceScope();
  return useMutation({
    mutationFn: (provider: SmsProviderCode) => updateSmsProvider(provider),
    onSuccess: async (data) => {
      qc.setQueryData(queryKeys.clientSmsProvider(scope), data);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsProvider(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsQueue(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsRecipientsRoot(scope) }),
      ]);
    },
  });
}

export function useClaimSmsDevice() {
  const qc = useQueryClient();
  const { scope } = useSmsDeviceScope();
  return useMutation({
    mutationFn: claimSmsDevice,
    onSuccess: async (device) => {
      qc.setQueryData<SmsDevice[]>(queryKeys.clientSmsDevices(scope), [device]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsDevices(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsProvider(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsQueue(scope) }),
      ]);
    },
  });
}

export function useDeleteSmsDevice() {
  const qc = useQueryClient();
  const { scope } = useSmsDeviceScope();
  return useMutation({
    mutationFn: deleteSmsDevice,
    onSuccess: async (_, code) => {
      // Clear the successful deletion immediately; do not leave a stale phone card on screen.
      qc.setQueryData<SmsDevice[]>(
        queryKeys.clientSmsDevices(scope),
        (previous) => previous?.filter((device) => device.deviceCode !== code),
      );
      // The server decides whether it changes provider after unlinking.
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsDevices(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsProvider(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsQueue(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsRecipientsRoot(scope) }),
      ]);
    },
  });
}
