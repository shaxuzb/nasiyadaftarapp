export interface SubscriptionSmsQuota {
  periodMonth: string | null;
  periodEnd?: string | null;
  monthlyLimit: number | null;
  monthlyUsed: number;
  monthlyRemaining: number | null;
  purchasedRemaining: number;
  totalRemaining: number | null;
}

export interface CurrentSubscription {
  subscriptionId: number;
  planId: number;
  planCode: string;
  planName: string;
  price: number;
  startAt: string;
  endAt: string | null;
  source: string;
  provider: string | null;
  cancellationRequestedAt: string | null;
  maxOrganizations: number | null;
  maxClients: number | null;
  unlimitedOrganizations: boolean;
  unlimitedClients: boolean;
  telegramBotEnabled: boolean;
  blacklistEnabled: boolean;
  transactionSmsEnabled: boolean;
  prioritySupportEnabled: boolean;
  sms: SubscriptionSmsQuota;
}

export interface SubscriptionPlan {
  id: number;
  code: string;
  name: string;
  description: string;
  /** What is charged. */
  price: number;
  /** The price before the discount, for display only; null when there is none. */
  oldPrice: number | null;
  /** The discount as the server states it, for display only. */
  discountPercent: number | null;
  durationDays: number | null;
  maxOrganizations: number | null;
  maxClients: number | null;
  monthlySmsLimit: number | null;
  telegramBotEnabled: boolean;
  blacklistEnabled: boolean;
  transactionSmsEnabled: boolean;
  prioritySupportEnabled: boolean;
  stateId: number;
  createdDate: string;
  updatedDate: string | null;
}

export interface SmsPackage {
  id: number;
  code: string;
  name: string;
  smsCount: number;
  /** What is charged. */
  price: number;
  /** The price before the discount, for display only; null when there is none. */
  oldPrice: number | null;
  /** The discount as the server states it, for display only. */
  discountPercent: number | null;
  stateId: number;
  createdDate: string;
  updatedDate: string | null;
}
