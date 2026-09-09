import type {
  BulkSmsResponse,
  PagedResult,
  SmsHistoryItem,
  SmsRecipient,
  SmsSendResult,
} from "../types";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === "object" ? (value as RecordValue) : {};
const text = (...values: unknown[]) => {
  const value = values.find((item) => typeof item === "string");
  return typeof value === "string" ? value.trim() : "";
};
const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const positiveId = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

function extractPage(input: unknown): { count: number; items: unknown[] } {
  if (Array.isArray(input)) return { count: input.length, items: input };
  const outer = record(input);
  for (const key of ["results", "items", "data", "result"]) {
    const candidate = outer[key];
    if (Array.isArray(candidate)) {
      return {
        count: Math.max(0, Math.trunc(number(outer.count, candidate.length))),
        items: candidate,
      };
    }
    const nested = record(candidate);
    for (const nestedKey of ["results", "items", "data"]) {
      if (Array.isArray(nested[nestedKey])) {
        const items = nested[nestedKey] as unknown[];
        return {
          count: Math.max(
            0,
            Math.trunc(number(nested.count ?? outer.count, items.length)),
          ),
          items,
        };
      }
    }
  }
  throw new Error("SMS ro'yxati noto'g'ri formatda qaytdi");
}

export function parseSmsRecipients(input: unknown): PagedResult<SmsRecipient> {
  const page = extractPage(input);
  return {
    count: page.count,
    results: page.items.flatMap((value) => {
      const item = record(value);
      const id = positiveId(item.id ?? item.clientId);
      if (!id) return [];
      return [
        {
          id,
          fullName: text(item.fullName, item.clientName) || "Mijoz",
          phone: text(item.phoneNumber, item.phone),
          currentBalance: number(item.currentBalance),
          overdueBalance: number(item.overdueBalance),
          isBlacklisted: item.isBlacklisted === true,
          canSend: item.canSend === true,
          cannotSendReason:
            text(item.cannotSendReason, item.skipReason, item.reason) ||
            undefined,
        },
      ];
    }),
  };
}

export function parseSmsSendResult(value: unknown): SmsSendResult {
  const outer = record(value);
  const item = Object.keys(record(outer.data)).length
    ? record(outer.data)
    : Object.keys(record(outer.result)).length
      ? record(outer.result)
      : outer;
  return {
    clientId: positiveId(item.clientId ?? item.id),
    fullName: text(item.fullName, item.clientName) || undefined,
    phone: text(item.phoneNumber, item.phone) || undefined,
    status: text(item.status) || "unknown",
    message: text(item.message) || undefined,
    errorMessage: text(item.errorMessage, item.error) || undefined,
  };
}

export function parseBulkSmsResponse(input: unknown): BulkSmsResponse {
  const outer = record(input);
  const value = Object.keys(record(outer.data)).length
    ? record(outer.data)
    : Object.keys(record(outer.result)).length
      ? record(outer.result)
      : outer;
  const rawResults = Array.isArray(value.results) ? value.results : [];
  return {
    sentCount: Math.max(0, Math.trunc(number(value.sentCount))),
    failedCount: Math.max(0, Math.trunc(number(value.failedCount))),
    skippedCount: Math.max(0, Math.trunc(number(value.skippedCount))),
    results: rawResults.map(parseSmsSendResult),
  };
}

export function parseSmsHistory(input: unknown): PagedResult<SmsHistoryItem> {
  const page = extractPage(input);
  return {
    count: page.count,
    results: page.items.map((value, index) => {
      const item = record(value);
      const status = text(item.status) || "unknown";
      return {
        id: positiveId(item.id) ?? -(index + 1),
        clientId: positiveId(item.clientId),
        fullName: text(item.fullName, item.clientName) || "Mijoz",
        phone: text(item.phoneNumber, item.phone),
        status,
        normalizedStatus: status.toLocaleLowerCase(),
        sentAt:
          text(item.sentDate, item.sentAt, item.createdDate, item.date) ||
          undefined,
        message: text(item.message, item.smsText) || undefined,
        errorMessage: text(item.errorMessage, item.error) || undefined,
      };
    }),
  };
}
