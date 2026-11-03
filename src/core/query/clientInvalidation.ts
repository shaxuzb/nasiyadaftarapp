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
    ...getClientDependentTabKeys(scope),
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

/**
 * Other tabs' data a change to clients makes stale: the reports and the SMS
 * list. Those tabs stay mounted once visited, so they are only marked here
 * and refetch when looked at (useRefetchInvalidatedOnFocus): the heavy report
 * is not recomputed for every payment typed in on another tab.
 */
function getClientDependentTabKeys(scope: QueryScope): QueryKey[] {
  return [["reports", scope], queryKeys.clientSmsRecipientsRoot(scope)];
}

export async function invalidateClientDomain(
  queryClient: QueryClient,
  scope: QueryScope,
  event: ClientInvalidationEvent,
  clientId?: number,
): Promise<void> {
  const keys = getClientInvalidationKeys(scope, event, clientId);
  const markOnly = new Set(getClientDependentTabKeys(scope).map((key) => JSON.stringify(key)));
  await Promise.all(
    keys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
        refetchType: markOnly.has(JSON.stringify(queryKey)) ? "none" : "active",
      }),
    ),
  );
}
