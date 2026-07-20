import { useCallback, useMemo } from "react";
import {
  useQueries,
  useQueryClient,
  UseQueryResult,
} from "@tanstack/react-query";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import { getClientHistory } from "../services/transactionsService";
import { Transaction } from "../types";

type HistoryQueryResult = Pick<
  UseQueryResult<Transaction[]>,
  "data" | "isPending" | "isFetching"
>;

function combineHistoryQueries(results: HistoryQueryResult[]) {
  return {
    transactions: results.flatMap((query) => query.data ?? []),
    isLoading: results.some((query) => query.isPending || query.isFetching),
  };
}

export function useTransactionQueries(
  scope: QueryScope,
  clientIds: number[],
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const historyQueryOptions = useMemo(
    () =>
      clientIds.map((clientId) => ({
        queryKey: queryKeys.transactionHistory(scope, clientId),
        queryFn: () => getClientHistory(clientId),
        enabled,
        staleTime: 30_000,
      })),
    [clientIds, enabled, scope],
  );

  const historyState = useQueries({
    queries: historyQueryOptions,
    combine: combineHistoryQueries,
  });

  const loadCustomerHistory = useCallback(
    (clientId: number) =>
      queryClient.fetchQuery({
        queryKey: queryKeys.transactionHistory(scope, clientId),
        queryFn: () => getClientHistory(clientId),
      }),
    [queryClient, scope],
  );

  return {
    transactions: historyState.transactions,
    isLoading: historyState.isLoading,
    loadCustomerHistory,
  };
}
