import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys, type QueryScope } from "./queryKeys";

export type ClientInvalidationEvent =
  | "created"
  | "updated"
  | "deleted"
  | "transaction"
  | "refresh";

export function getClientInvalidationKeys(
  scope: QueryScope,
  event: ClientInvalidationEvent,
  clientId?: number,
): QueryKey[] {
  const keys: QueryKey[] = [
    queryKeys.clients(scope),
    queryKeys.clientSearchRoot(scope),
    ["reports", scope],
    queryKeys.clientSmsRecipientsRoot(scope),
  ];

  if (event === "updated" && typeof clientId === "number") {
    keys.push(queryKeys.client(scope, clientId));
  }

  if (
    event === "deleted" ||
    event === "transaction" ||
    event === "refresh"
  ) {
    keys.push(queryKeys.transactions(scope));
  }

  if (
    (event === "deleted" || event === "transaction") &&
    typeof clientId === "number"
  ) {
    keys.push(
      queryKeys.client(scope, clientId),
      queryKeys.transactionHistory(scope, clientId),
    );
  }

  return keys;
}

export async function invalidateClientDomain(
  queryClient: QueryClient,
  scope: QueryScope,
  event: ClientInvalidationEvent,
  clientId?: number,
): Promise<void> {
  const keys = getClientInvalidationKeys(scope, event, clientId);
  await Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
