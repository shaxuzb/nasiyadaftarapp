import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import { getClientList } from "../services/clientsService";

const EMPTY_CLIENT_SEARCH_RESULT = { customers: [], count: 0 };

export function useClientSearch(
  _scope: QueryScope,
  _enabled: boolean,
  search: string,
) {
  const { user, currentOrganization } = useAuth();
  const { scope, enabled } = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );
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
