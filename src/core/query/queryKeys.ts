export type QueryScope = string | number;

export const queryKeys = {
  clients: (scope: QueryScope) => ["clients", scope] as const,
  client: (scope: QueryScope, id: number) => ["client", scope, id] as const,
  transactions: (scope: QueryScope) => ["transactions", scope] as const,
  transactionHistory: (scope: QueryScope, clientId: number) =>
    ["transactions", scope, "history", clientId] as const,
};
