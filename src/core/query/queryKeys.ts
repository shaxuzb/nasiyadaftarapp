export type QueryScope = string | number;

export const queryKeys = {
  subscriptionRoot: () => ["subscription"] as const,
  subscriptionCurrent: (scope: QueryScope) =>
    ["subscription", scope, "current"] as const,
  subscriptionPlans: () => ["subscription", "plans"] as const,
  subscriptionSmsPackages: () => ["subscription", "sms-packages"] as const,
  paymentsRoot: () => ["payments"] as const,
  paymentsHistoryRoot: () => ["payments", "history"] as const,
  paymentsHistory: (limit: number) => ["payments", "history", limit] as const,
  payment: (orderId: number) => ["payments", "detail", orderId] as const,
  clientSmsRoot: () => ["client-sms"] as const,
  clientSmsTemplate: (scope: QueryScope) =>
    ["client-sms", scope, "template"] as const,
  clientSmsRecipientsRoot: (scope: QueryScope) =>
    ["client-sms", scope, "recipients"] as const,
  clientSmsRecipients: (scope: QueryScope, filters: object) =>
    ["client-sms", scope, "recipients", filters] as const,
  clientSmsHistoryRoot: (scope: QueryScope) =>
    ["client-sms", scope, "history"] as const,
  clientSmsHistory: (scope: QueryScope, filters: object) =>
    ["client-sms", scope, "history", filters] as const,
  organizationsRoot: () => ["organizations"] as const,
  currentOrganization: (scope: QueryScope) =>
    ["organizations", scope, "current"] as const,
  clientsRoot: () => ["clients"] as const,
  clients: (scope: QueryScope) => ["clients", scope] as const,
  clientSearchRoot: (scope: QueryScope) =>
    ["clients", scope, "search"] as const,
  clientSearch: (scope: QueryScope, search: string) =>
    ["clients", scope, "search", search] as const,
  clientRoot: () => ["client"] as const,
  client: (scope: QueryScope, id: number) => ["client", scope, id] as const,
  transactionsRoot: () => ["transactions"] as const,
  transactions: (scope: QueryScope) => ["transactions", scope] as const,
  transactionHistory: (scope: QueryScope, clientId: number) =>
    ["transactions", scope, "history", clientId] as const,
  reportsRoot: () => ["reports"] as const,
  reports: (
    scope: QueryScope,
    params: { months: number; topDebtorsLimit: number },
  ) => ["reports", scope, params] as const,
};
