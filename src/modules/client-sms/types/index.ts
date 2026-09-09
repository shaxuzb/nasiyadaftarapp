export interface PagedResult<T> {
  count: number;
  results: T[];
}

export interface SmsRecipientFilters {
  search?: string;
  blacklisted?: boolean;
  hasDebt?: boolean;
  canSend?: boolean;
  pageNumber: number;
  pageSize: number;
}

export interface SmsHistoryFilters {
  status?: string;
  search?: string;
  pageNumber: number;
  pageSize: number;
}

export interface SmsRecipient {
  id: number;
  fullName: string;
  phone: string;
  currentBalance: number;
  overdueBalance: number;
  isBlacklisted: boolean;
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
}

export interface IndividualSmsResult extends SmsSendResult {}

export interface BulkSmsResponse {
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  results: SmsSendResult[];
}
