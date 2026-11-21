import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { getDueClients } from "../services/dueClientsService";
import { sortDueClients } from "../utils/dueClients";

/**
 * Customers whose debt is due on `date` and who still owe. Kept under the
 * customers' key, so a debt or payment written anywhere refreshes it.
 */
export function useDueClients(date: string, { enabled = true }: { enabled?: boolean } = {}) {
  const { user, currentOrganization } = useAuth();
  const organization = getOrganizationQueryScope(user?.id, currentOrganization?.id);
  const query = useQuery({
    queryKey: queryKeys.dueClients(organization.scope, date),
    queryFn: ({ signal }) => getDueClients(date, signal),
    enabled: enabled && organization.enabled,
    staleTime: 60_000,
  });
  const clients = useMemo(() => sortDueClients(query.data ?? []), [query.data]);
  return { ...query, clients };
}
