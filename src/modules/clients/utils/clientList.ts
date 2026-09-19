import type { Customer } from "../types";

interface CustomerCountLabelOptions {
  visibleCount: number;
  serverCount: number;
  query: string;
  debtorOnly: boolean;
}

export interface CustomerListItem {
  customer: Customer;
  balance: number;
}

function createdAtTimestamp(customer: Customer) {
  if (!customer.createdAt) return 0;
  const timestamp = Date.parse(customer.createdAt);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function sortCustomerList(
  items: readonly CustomerListItem[],
  debtorOnly: boolean,
): CustomerListItem[] {
  return [...items].sort((left, right) => {
    if (debtorOnly && right.balance !== left.balance) {
      return right.balance - left.balance;
    }

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

export function getCustomerCountLabel({
  visibleCount,
  serverCount,
  query,
  debtorOnly,
}: CustomerCountLabelOptions): string {
  if (debtorOnly) {
    return `${visibleCount} ta qarzdor mijoz`;
  }

  return query.trim() ? `${serverCount} ta natija` : `${visibleCount} ta mijoz`;
}
