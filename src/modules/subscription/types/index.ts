export interface SubscriptionSmsQuota {
  periodMonth: string | null;
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
  price: number;
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
  price: number;
  stateId: number;
  createdDate: string;
  updatedDate: string | null;
}
