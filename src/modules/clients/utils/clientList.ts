import type { Customer } from "../types";

export interface CustomerListItem {
  customer: Customer;
  balance: number;
}

function createdAtTimestamp(customer: Customer) {
  if (!customer.createdAt) return 0;
  const timestamp = Date.parse(customer.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

/** Newest customer first; among customers created together, the higher id. */
export function sortCustomerList(
  items: readonly CustomerListItem[],
): CustomerListItem[] {
  return [...items].sort((left, right) => {
    const createdAtDifference =
      createdAtTimestamp(right.customer) - createdAtTimestamp(left.customer);
    if (createdAtDifference !== 0) return createdAtDifference;

    return right.customer.id - left.customer.id;
  });
}

export function getClientResultCount(
  value: unknown,
  resultsLength: number,
): number {
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : resultsLength;
}
