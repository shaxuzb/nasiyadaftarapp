import { apiClient } from "../../../services/axiosService";
import type {
  SmsHistoryFilters,
  SmsRecipientFilters,
  SmsTemplate,
  UpdateAutoReminderPayload,
} from "../types";
import {
  parseBulkSmsResponse,
  parseSmsHistory,
  parseSmsRecipients,
  parseSmsPreview,
  parseSmsSendResult,
  parseSmsTemplate,
  parseSmsQueue,
  parseAutoReminderSettings,
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

export async function previewDebtSms(clientIds: number[]) {
  const normalized = [...new Set(clientIds.filter((id) => Number.isInteger(id) && id > 0))];
  if (!normalized.length || normalized.length !== clientIds.length) throw new Error("SMS uchun mijozlarni tekshiring");
  const { data } = await apiClient.post<unknown>("/clients/debt-sms/preview", { clientIds: normalized });
  return parseSmsPreview(data);
}

export async function getDebtSmsQueue(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/clients/debt-sms/queue", { signal });
  return parseSmsQueue(data);
}

export async function cancelDebtSmsQueueItem(logId: number) {
  if (!Number.isInteger(logId) || logId <= 0) throw new Error("SMS log ID noto'g'ri");
  await apiClient.post(`/clients/debt-sms/queue/${logId}/cancel`);
}

// Uses the authenticated app API client; never hard-code an access token.
export async function getAutoReminderSettings(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/sms/auto-reminder", { signal });
  return parseAutoReminderSettings(data);
}

export async function updateAutoReminderSettings(payload: UpdateAutoReminderPayload) {
  if (!Number.isSafeInteger(payload.intervalDays) || payload.intervalDays < 1 ||
      !Number.isFinite(payload.minBalance) || payload.minBalance < 0) {
    throw new Error("Avto eslatma qiymatlarini tekshiring");
  }
  await apiClient.put("/sms/auto-reminder", payload);
}
