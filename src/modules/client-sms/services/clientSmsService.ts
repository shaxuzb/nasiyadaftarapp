import { apiClient } from "../../../services/axiosService";
import type {
  SmsHistoryFilters,
  SmsRecipientFilters,
  SmsTemplate,
} from "../types";
import {
  parseBulkSmsResponse,
  parseSmsHistory,
  parseSmsRecipients,
  parseSmsSendResult,
  parseSmsTemplate,
} from "../utils/smsParsing";

const params = (input: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );

export async function getDebtSmsTemplate(
  signal?: AbortSignal,
): Promise<SmsTemplate> {
  const { data } = await apiClient.get<unknown>("/clients/debt-sms/template", {
    signal,
  });
  return parseSmsTemplate(data);
}

export async function getSmsRecipients(
  filters: SmsRecipientFilters,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<unknown>("/clients/sms-recipients", {
    signal,
    params: params({ ...filters, search: filters.search?.trim() || undefined }),
  });
  return parseSmsRecipients(data);
}

export async function sendDebtSms(clientId: number) {
  if (!Number.isInteger(clientId) || clientId <= 0)
    throw new Error("Mijoz ID noto'g'ri");
  const { data } = await apiClient.post<unknown>(
    `/clients/${clientId}/debt-sms`,
  );
  return parseSmsSendResult(data);
}

export async function sendBulkDebtSms(clientIds: number[]) {
  const normalized = [
    ...new Set(clientIds.filter((id) => Number.isInteger(id) && id > 0)),
  ];
  if (!normalized.length) throw new Error("SMS yuborish uchun mijoz tanlang");
  const { data } = await apiClient.post<unknown>("/clients/debt-sms/bulk", {
    clientIds: normalized,
  });
  return parseBulkSmsResponse(data);
}

export async function getDebtSmsHistory(
  filters: SmsHistoryFilters,
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<unknown>("/clients/debt-sms/history", {
    signal,
    params: params({
      ...filters,
      status: filters.status?.trim() || undefined,
      search: filters.search?.trim() || undefined,
    }),
  });
  return parseSmsHistory(data);
}
