export interface PagedResult<T> {
  count: number;
  results: T[];
}

export interface SmsRecipientFilters {
  search?: string;
  blacklisted?: boolean;
  hasDebt?: boolean;
  canSend?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface SmsHistoryFilters {
  status?: string;
  search?: string;
  pageNumber: number;
  pageSize: number;
}

export interface SmsTemplate {
  template: string;
  placeholders: string[];
}

export type SmsTemplateValues = Record<string, string | undefined>;

export interface SmsRecipient {
  id: number;
  fullName: string;
  phone: string;
  currentBalance: number;
  overdueBalance: number;
  isBlacklisted: boolean;
  blacklistedOrganizationCount: number;
  canSend: boolean;
  cannotSendReason?: string;
  /** Includes SMS queued today; not evidence of delivery. */
  smsSentToday: boolean;
  nextSmsAvailableDate?: string;
  lastSmsAt?: string;
  /** Status of the exact same SMS as lastSmsAt. Null means no SMS history. */
  lastSmsStatus: SmsRecipientLastStatus | null;
}

export type SmsRecipientLastStatus =
  | "sent"
  | "queued"
  | "pending"
  | "failed"
  | "cancelled";

export interface SmsHistoryItem {
  id: number;
  clientId?: number;
  fullName: string;
  phone: string;
  status: string;
  normalizedStatus: string;
  source?: string;
  queuePosition?: number;
  estimatedSendDate?: string;
  sentAt?: string;
  message?: string;
  errorMessage?: string;
}

export interface SmsSendResult {
  logId?: number;
  clientId?: number;
  fullName?: string;
  phone?: string;
  status: string;
  queuePosition?: number;
  estimatedSendDate?: string;
  message?: string;
  errorMessage?: string;
  quotaSource?: string;
  quota?: SmsSendQuota;
}

export interface SmsSendQuota {
  periodMonth?: string | null;
  periodEnd?: string | null;
  monthlyLimit?: number | null;
  monthlyUsed?: number;
  monthlyRemaining: number | null;
  purchasedRemaining: number;
  totalRemaining: number | null;
}

export interface IndividualSmsResult extends SmsSendResult {}

export interface BulkSmsResponse {
  sentCount: number;
  queuedCount: number;
  failedCount: number;
  skippedCount: number;
  results: SmsSendResult[];
  quotaSource?: string;
  quota?: SmsSendQuota;
}

export interface SmsPreview {
  requested: number;
  eligible: number;
  sendNow: number;
  queued: number;
  skipped: number;
  estimatedLastSendDate: string | null;
  quotaRemaining: number | null;
  ownDevice: boolean;
  message: string;
  skippedClients: { clientId: number; fullName: string; reason: string }[];
}

/** Confirmed envelope of GET /clients/debt-sms/queue; item fields are not yet documented. */
export interface SmsQueue {
  queuedCount: number;
  ownDevice: boolean;
  items: SmsHistoryItem[];
}

export interface AutoReminderSettings {
  available: boolean;
  enabled: boolean;
  intervalDays: number;
  minBalance: number;
  minIntervalDays: number;
  lastRunDate: string | null;
}

export interface UpdateAutoReminderPayload {
  enabled: boolean;
  intervalDays: number;
  minBalance: number;
}
