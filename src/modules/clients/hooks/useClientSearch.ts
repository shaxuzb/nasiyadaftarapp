import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import { getClientList } from "../services/clientsService";

const EMPTY_CLIENT_SEARCH_RESULT = { customers: [], count: 0 };

export function useClientSearch(
  scope: QueryScope,
  enabled: boolean,
  search: string,
) {
  const normalizedSearch = search.trim();
  const query = useQuery({
    queryKey: queryKeys.clientSearch(scope, normalizedSearch),
    queryFn: ({ signal }) => getClientList(normalizedSearch, signal),
    enabled: enabled && normalizedSearch.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return {
    result: query.data ?? EMPTY_CLIENT_SEARCH_RESULT,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
