import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys, QueryScope } from "../../../core/query/queryKeys";
import { getClientList } from "../services/clientsService";
import { searchSavedCustomers } from "../../offline/db/savedDataRepository";
import {
  reportSavedDataShown,
  reportServerAnswered,
} from "../../offline/state/savedDataStatus";
import { withSavedDataFallback, type Saved } from "../../offline/utils/savedData";
import { isServerDown } from "../../offline/state/serverStatus";
import type { ClientListResult } from "../../../services/clientsApi";
import { useOutbox } from "../../offline/db/outboxRepository";
import { applyPendingToCustomers } from "../../offline/sync/pendingOverlay";

/** Whether a customer added offline matches what was typed (name or number). */
function matchesSearch(customer: { fullName: string; phone: string }, search: string): boolean {
  const text = search.toLocaleLowerCase();
  if (customer.fullName.toLocaleLowerCase().includes(text)) return true;
  const digits = search.replace(/\D/g, "");
  return digits.length > 0 && customer.phone.replace(/\D/g, "").includes(digits);
}

// The saved customers matching a search, in the shape the server answers.
async function searchOnPhone(scope: QueryScope, search: string): Promise<Saved<ClientListResult> | null> {
  const saved = await searchSavedCustomers(scope, search);
  return saved
    ? { data: { customers: saved.data, count: saved.data.length }, savedAt: saved.savedAt }
    : null;
}

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
    queryFn: async ({ signal }) => {
      // While the server is known to be out of reach, every letter typed
      // would wait for its timeout: search the phone straight away.
      if (isServerDown()) {
        const saved = await searchOnPhone(scope, normalizedSearch);
        if (saved) return saved.data;
      }
      return withSavedDataFallback({
        serverDown: isServerDown(),
        fetch: () => getClientList(normalizedSearch, signal),
        // The whole list is kept already; a search adds nothing to it.
        save: () => undefined,
        load: () => searchOnPhone(scope, normalizedSearch),
        onFresh: reportServerAnswered,
        onSaved: reportSavedDataShown,
      });
    },
    enabled: enabled && normalizedSearch.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  // What was written offline and not yet sent, laid over the results: the
  // customers added offline that match, and waiting writes in the balances.
  const outbox = useOutbox();
  const result = useMemo(() => {
    const found = query.data ?? EMPTY_CLIENT_SEARCH_RESULT;
    const operations = outbox.filter((operation) => operation.organizationId === currentOrganization?.id);
    if (!operations.some((operation) => operation.status === "pending") || normalizedSearch.length === 0) return found;
    const customers = applyPendingToCustomers(found.customers, operations).filter(
      (customer) => customer.id > 0 || matchesSearch(customer, normalizedSearch),
    );
    return { customers, count: found.count + (customers.length - found.customers.length) };
  }, [currentOrganization?.id, normalizedSearch, outbox, query.data]);

  return {
    result,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
  };
}
