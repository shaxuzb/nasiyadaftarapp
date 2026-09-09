import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
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
  const { user } = useAuth();
  return {
    user,
    scope: user?.organizationId ?? user?.id ?? "anonymous",
    capabilities: getClientSmsCapabilities(user?.permissions),
  };
}

export function useSmsRecipients(filters: SmsRecipientFilters) {
  const { user, scope, capabilities } = useSmsScope();
  return useQuery({
    queryKey: queryKeys.clientSmsRecipients(scope, filters),
    queryFn: ({ signal }) => getSmsRecipients(filters, signal),
    enabled: Boolean(user && capabilities.canView),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSmsHistory(filters: SmsHistoryFilters) {
  const { user, scope, capabilities } = useSmsScope();
  return useQuery({
    queryKey: queryKeys.clientSmsHistory(scope, filters),
    queryFn: ({ signal }) => getDebtSmsHistory(filters, signal),
    enabled: Boolean(user && capabilities.canViewHistory),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useSmsTemplate() {
  const { user, scope, capabilities } = useSmsScope();
  return useQuery({
    queryKey: queryKeys.clientSmsTemplate(scope),
    queryFn: ({ signal }) => getDebtSmsTemplate(signal),
    enabled: Boolean(
      user &&
      capabilities.canView &&
      (capabilities.canSendOne || capabilities.canSendBulk),
    ),
    staleTime: 5 * 60_000,
  });
}

function useSmsInvalidation() {
  const queryClient = useQueryClient();
  const { scope } = useSmsScope();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.clientSmsRecipientsRoot(scope),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.clientSmsHistoryRoot(scope),
    });
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
