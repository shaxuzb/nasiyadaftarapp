import type { Customer } from "../types";

/**
 * Whether to warn before trading with this customer: blacklisted here, or in
 * any other organization. Same rule the customer profile uses for its badge.
 */
export function isCustomerBlacklisted(
  customer: Pick<
    Customer,
    "isBlacklisted" | "blacklistedOrganizationCount" | "blacklistedOrganizations"
  >,
): boolean {
  return (
    customer.isBlacklisted === true ||
    (customer.blacklistedOrganizationCount ?? 0) > 0 ||
    (customer.blacklistedOrganizations?.length ?? 0) > 0
  );
}
