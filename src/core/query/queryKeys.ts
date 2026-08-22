export type QueryScope = string | number;

export const queryKeys = {
  organizationsRoot: () => ["organizations"] as const,
  clientsRoot: () => ["clients"] as const,
  clients: (scope: QueryScope) => ["clients", scope] as const,
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
