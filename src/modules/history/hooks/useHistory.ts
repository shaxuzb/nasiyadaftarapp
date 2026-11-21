import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  getDeletedClient,
  getDeletedClients,
  getOrganizationChanges,
  getPurchases,
} from "../services/historyService";
import { nextPageParam, type Page } from "../utils/historyParsing";

function useOrganization() {
  const { user, currentOrganization } = useAuth();
  return getOrganizationQueryScope(user?.id, currentOrganization?.id);
}

/** Every loaded page's rows, flat, for a FlatList. */
function useRows<T>(data: { pages: Page<T>[] } | undefined): T[] {
  return useMemo(() => data?.pages.flatMap((item) => item.results) ?? [], [data]);
}

// History is read rarely and changes elsewhere (a customer deleted on another
// phone): each visit asks again, while the pages already seen show at once.
const FRESH = { staleTime: 0, gcTime: 5 * 60_000 } as const;

export function useDeletedClients(search: string) {
  const organization = useOrganization();
  const query = useInfiniteQuery({
    queryKey: queryKeys.historyDeletedClients(organization.scope, search),
    queryFn: ({ pageParam, signal }) =>
      getDeletedClients({ page: Number(pageParam), search: search || undefined }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: organization.enabled,
    ...FRESH,
  });
  return { ...query, rows: useRows(query.data) };
}

export function useDeletedClient(id: number) {
  const organization = useOrganization();
  return useQuery({
    queryKey: queryKeys.historyDeletedClient(organization.scope, id),
    queryFn: ({ signal }) => getDeletedClient(id, signal),
    enabled: organization.enabled && id > 0,
    // A deleted customer no longer changes.
    staleTime: 5 * 60_000,
  });
}

export function usePurchases() {
  const { user } = useAuth();
  const query = useInfiniteQuery({
    queryKey: queryKeys.historyPurchases(user?.id ?? "anonymous"),
    queryFn: ({ pageParam, signal }) => getPurchases({ page: Number(pageParam) }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: typeof user?.id === "number",
    ...FRESH,
  });
  return { ...query, rows: useRows(query.data) };
}

export function useOrganizationChanges() {
  const organization = useOrganization();
  const query = useInfiniteQuery({
    queryKey: queryKeys.historyOrganization(organization.scope),
    queryFn: ({ pageParam, signal }) =>
      getOrganizationChanges({ page: Number(pageParam) }, signal),
    initialPageParam: 1,
    getNextPageParam: nextPageParam,
    enabled: organization.enabled,
    ...FRESH,
  });
  return { ...query, rows: useRows(query.data) };
}
