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

/**
 * The shop's phones. `poll` keeps the phone's state (online, numbers left
 * today) fresh while it is on screen: pass true only from the screen that
 * shows it and only while that screen is in front. Each caller that polls
 * runs its own timer, so a second view of the same data passes false.
 */
export function useSmsDevices({ poll = false }: { poll?: boolean } = {}) {
  const { scope, enabled } = useSmsDeviceScope();
  return useQuery({
    queryKey: queryKeys.clientSmsDevices(scope),
    queryFn: ({ signal }) => getSmsDevices(signal),
    enabled,
    staleTime: 15_000,
    refetchInterval: poll ? 30_000 : false,
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

/**
 * The Qarz Daftar SMS balance lives on the subscription. Fetched again when
 * the source changes, so the SMS screen shows today's count the moment it
 * switches to that balance, not the one left from before the phone.
 */
function useRefreshSmsBalance() {
  const { refreshSubscription } = useAuth();
  return () => {
    void refreshSubscription().catch(() => undefined);
  };
}

export function useUpdateSmsProvider() {
  const qc = useQueryClient();
  const { scope } = useSmsDeviceScope();
  const refreshSmsBalance = useRefreshSmsBalance();
  return useMutation({
    mutationFn: (provider: SmsProviderCode) => updateSmsProvider(provider),
    onSuccess: async (data) => {
      qc.setQueryData(queryKeys.clientSmsProvider(scope), data);
      refreshSmsBalance();
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

/**
 * What unlinking a phone did to the way SMS are sent.
 *   kept      other phones remain, or the source was not the phone
 *   switched  that was the last phone: SMS now go through Qarz Daftar SMS
 *   failed    the phone is gone, but switching the source did not go through
 */
export type SmsDeviceRemoval = { source: "kept" | "switched" | "failed" };

export function useDeleteSmsDevice() {
  const qc = useQueryClient();
  const { scope } = useSmsDeviceScope();
  const refreshSmsBalance = useRefreshSmsBalance();
  return useMutation({
    // With its last phone gone, "my phone" can send nothing: SMS would wait
    // in the queue for a phone that is not coming. So the source goes back to
    // Qarz Daftar SMS straight away, unasked, as part of unlinking.
    mutationFn: async (code: string): Promise<SmsDeviceRemoval> => {
      await deleteSmsDevice(code);
      const remaining = (qc.getQueryData<SmsDevice[]>(queryKeys.clientSmsDevices(scope)) ?? [])
        .filter((device) => device.deviceCode !== code);
      if (remaining.length) return { source: "kept" };
      try {
        // The server's word on the source, not a cached guess: it may have
        // switched it already.
        const current = await getSmsProvider();
        if (current.provider !== "own_device") {
          qc.setQueryData(queryKeys.clientSmsProvider(scope), current);
          return { source: "kept" };
        }
        qc.setQueryData(queryKeys.clientSmsProvider(scope), await updateSmsProvider("system"));
        return { source: "switched" };
      } catch {
        // The phone is unlinked either way; this is reported, not thrown, so
        // the user is not told the unlinking failed.
        return { source: "failed" };
      }
    },
    onSuccess: async (removal, code) => {
      if (removal.source === "switched") refreshSmsBalance();
      // Clear the successful deletion immediately; do not leave a stale phone card on screen.
      qc.setQueryData<SmsDevice[]>(
        queryKeys.clientSmsDevices(scope),
        (previous) => previous?.filter((device) => device.deviceCode !== code),
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsDevices(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsProvider(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsQueue(scope) }),
        qc.invalidateQueries({ queryKey: queryKeys.clientSmsRecipientsRoot(scope) }),
      ]);
    },
  });
}
