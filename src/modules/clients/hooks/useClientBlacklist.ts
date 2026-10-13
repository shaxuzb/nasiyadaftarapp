import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { getClientById } from "../services/clientsService";
import type { BlacklistedOrganization } from "../types";

/**
 * The organizations a customer is blacklisted in.
 *
 * The customer list and the SMS list say only how many there are; the names,
 * dates and limits come with the customer's own record. So when the caller
 * does not already have them, this reads that record — the same cached query
 * the profile screen uses, so opening the profile afterwards costs nothing.
 */
export function useClientBlacklist(
  customerId: number,
  known?: readonly BlacklistedOrganization[],
) {
  const { user, currentOrganization } = useAuth();
  const { scope, enabled } = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );
  const hasKnown = (known?.length ?? 0) > 0;
  const query = useQuery({
    queryKey: queryKeys.client(scope, customerId),
    queryFn: ({ signal }) => getClientById(customerId, signal),
    enabled: enabled && !hasKnown,
    staleTime: 30_000,
  });

  const organizations: readonly BlacklistedOrganization[] = hasKnown
    ? (known ?? [])
    : (query.data?.blacklistedOrganizations ?? []);
  // A customer cached from a list has no names yet; that is "still loading",
  // not "none", for as long as the record is on its way.
  const waiting = !hasKnown && organizations.length === 0;

  return {
    organizations,
    isLoading: waiting && query.isFetching,
    isError: waiting && !query.isFetching && query.isError,
    retry: () => void query.refetch(),
  };
}
