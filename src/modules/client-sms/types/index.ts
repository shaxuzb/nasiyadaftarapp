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
}

export interface SmsHistoryItem {
  id: number;
  clientId?: number;
  fullName: string;
  phone: string;
  status: string;
  normalizedStatus: string;
  sentAt?: string;
  message?: string;
  errorMessage?: string;
}

export interface SmsSendResult {
  clientId?: number;
  fullName?: string;
  phone?: string;
  status: string;
  message?: string;
  errorMessage?: string;
  quotaSource?: string;
  quota?: SmsSendQuota;
}

export interface SmsSendQuota {
  monthlyRemaining: number | null;
  purchasedRemaining: number;
  totalRemaining: number | null;
}

export interface IndividualSmsResult extends SmsSendResult {}

export interface BulkSmsResponse {
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  results: SmsSendResult[];
  quotaSource?: string;
  quota?: SmsSendQuota;
}
