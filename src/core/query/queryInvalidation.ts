import { queryClient } from "./queryClient";
import { queryKeys } from "./queryKeys";

const organizationDependentQueryKeys = [
  queryKeys.subscriptionRoot(),
  queryKeys.clientSmsRoot(),
  queryKeys.organizationsRoot(),
  queryKeys.clientsRoot(),
  queryKeys.clientRoot(),
  queryKeys.transactionsRoot(),
  queryKeys.reportsRoot(),
] as const;

/**
 * Removes data that belongs to the previously selected account/organization.
 * This is used when the authenticated organization itself changes.
 */
export function clearOrganizationQueries(): void {
  organizationDependentQueryKeys.forEach((queryKey) => {
    queryClient.removeQueries({ queryKey });
  });
}

/**
 * Refreshes active account-dependent requests after a verified account change.
 * Inactive queries are invalidated too, so they cannot serve stale data later.
 */
export async function invalidateAccountDependentQueries(): Promise<void> {
  await Promise.all(
    organizationDependentQueryKeys.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}
