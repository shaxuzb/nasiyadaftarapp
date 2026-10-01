import { Customer } from "../types";
import { Transaction } from "../../transactions/types";export function createBalanceMap(
  transactions: Transaction[],
): Map<number, number> {
  const balances = new Map<number, number>();

  for (const transaction of transactions) {
    const current = balances.get(transaction.customerId) ?? 0;
    balances.set(
      transaction.customerId,
      current +
        (transaction.type === "debt" ? transaction.amount : -transaction.amount),
    );
  }

  return balances;
}

export function createCustomerMap(customers: Customer[]): Map<number, Customer> {
  return new Map(customers.map((customer) => [customer.id, customer]));
}
