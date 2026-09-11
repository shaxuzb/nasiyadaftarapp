import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import {
  getClientHistories,
  getClientHistory,
} from "../services/transactionsService";
import { Transaction } from "../types";

const EMPTY_TRANSACTIONS: Transaction[] = [];
const HISTORY_STALE_TIME = 30_000;

export function useTransactionQueries(
  scope: QueryScope,
  clientIdsWithMissingBalance: number[],
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const historyQueryKey = useMemo(
    () =>
      [...queryKeys.transactions(scope), "missing-balances", clientIdsWithMissingBalance] as const,
    [clientIdsWithMissingBalance, scope],
  );

  const historyQuery = useQuery({
    queryKey: historyQueryKey,
    queryFn: async () => {
      const transactions = await getClientHistories(clientIdsWithMissingBalance);

      // Seed detail caches so opening a customer does not repeat a request
      // that was already part of the dashboard load.
      const transactionsByClient = new Map<number, Transaction[]>();
      for (const transaction of transactions) {
        const items = transactionsByClient.get(transaction.customerId) ?? [];
        items.push(transaction);
        transactionsByClient.set(transaction.customerId, items);
      }

      for (const [clientId, items] of transactionsByClient) {
        queryClient.setQueryData(
          queryKeys.transactionHistory(scope, clientId),
          items,
        );
      }

      return transactions;
    },
    enabled: enabled && clientIdsWithMissingBalance.length > 0,
    staleTime: HISTORY_STALE_TIME,
  });

  const loadCustomerHistory = useCallback(
    (clientId: number) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.transactionHistory(scope, clientId),
        queryFn: () => getClientHistory(clientId),
        staleTime: HISTORY_STALE_TIME,
      }),
    [queryClient, scope],
  );

  return {
    transactions: historyQuery.data ?? EMPTY_TRANSACTIONS,
    isLoading:
      clientIdsWithMissingBalance.length > 0 &&
      (historyQuery.isPending || historyQuery.isFetching),
    error: historyQuery.error,
    loadCustomerHistory,
  };
}
