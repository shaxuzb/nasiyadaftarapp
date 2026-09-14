import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  getDebtSmsHistory,
  getDebtSmsTemplate,
  getSmsRecipients,
  sendBulkDebtSms,
  sendDebtSms,
} from "../services/clientSmsService";
import type { SmsHistoryFilters, SmsRecipientFilters } from "../types";
import { getClientSmsCapabilities } from "../utils/smsPermissions";

function useSmsScope() {
  const { user, currentOrganization } = useAuth();
  const organizationScope = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );
  return {
    user,
    ...organizationScope,
    capabilities: getClientSmsCapabilities(
      user?.permissions,
      user?.subscription,
    ),
  };
}

export function useSmsRecipients(filters: SmsRecipientFilters) {
  const { enabled, scope, capabilities } = useSmsScope();
  return useQuery({
    queryKey: queryKeys.clientSmsRecipients(scope, filters),
    queryFn: ({ signal }) => getSmsRecipients(filters, signal),
    enabled: enabled && capabilities.canView,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSmsHistory(filters: SmsHistoryFilters) {
  const { enabled, scope, capabilities } = useSmsScope();
  return useQuery({
    queryKey: queryKeys.clientSmsHistory(scope, filters),
    queryFn: ({ signal }) => getDebtSmsHistory(filters, signal),
    enabled: enabled && capabilities.canViewHistory,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSmsTemplate() {
  const { enabled, scope, capabilities } = useSmsScope();
  return useQuery({
    queryKey: queryKeys.clientSmsTemplate(scope),
    queryFn: ({ signal }) => getDebtSmsTemplate(signal),
    enabled:
      enabled &&
      capabilities.canView &&
      (capabilities.canSendOne || capabilities.canSendBulk),
    staleTime: 5 * 60_000,
  });
}

function useSmsInvalidation() {
  const queryClient = useQueryClient();
  const { scope } = useSmsScope();
  const { refreshSubscription } = useAuth();
  return async () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.clientSmsRecipientsRoot(scope),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.clientSmsHistoryRoot(scope),
    });
    try {
      await refreshSubscription();
    } catch {
      // The send itself already succeeded; a quota refresh can retry on the next screen focus.
    }
  };
}

export function useSendDebtSms() {
  const invalidate = useSmsInvalidation();
  return useMutation({ mutationFn: sendDebtSms, onSuccess: invalidate });
}

export function useSendBulkDebtSms() {
  const invalidate = useSmsInvalidation();
  return useMutation({ mutationFn: sendBulkDebtSms, onSuccess: invalidate });
}
