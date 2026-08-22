import { Customer } from "../../clients/types";
import { Transaction } from "../../transactions/types";
import { createBalanceMap } from "../../clients/utils/clientCalculations";

export interface DashboardStats {
  totalDebt: number;
  totalPaid: number;
  remainingBalance: number;
  activeDebtorsCount: number;
  totalCustomers: number;
}

export interface DebtorEntry {
  customer: Customer;
  balance: number;
}

function getEffectiveBalance(
  customer: Customer,
  transactionBalances: Map<number, number>,
): number {
  return Number.isFinite(customer.currentBalance)
    ? customer.currentBalance ?? 0
    : transactionBalances.get(customer.id) ?? 0;
}

export function getDashboardStats(
  customers: Customer[],
  transactions: Transaction[],
): DashboardStats {
  const balances = createBalanceMap(transactions);
  let totalDebt = 0;
  let totalPaid = 0;

  for (const transaction of transactions) {
    if (transaction.type === "debt") totalDebt += transaction.amount;
    else totalPaid += transaction.amount;
  }

  let activeDebtorsCount = 0;
  let remainingBalance = 0;
  for (const customer of customers) {
    const balance = getEffectiveBalance(customer, balances);
    if (balance > 0) activeDebtorsCount += 1;
    remainingBalance += Math.max(balance, 0);
  }

  return {
    totalDebt,
    totalPaid,
    remainingBalance,
    activeDebtorsCount,
    totalCustomers: customers.length,
  };
}

export function getTopDebtors(
  customers: Customer[],
  transactions: Transaction[],
  limit = 5,
): DebtorEntry[] {
  const balances = createBalanceMap(transactions);
  return customers
    .map((customer) => ({
      customer,
      balance: getEffectiveBalance(customer, balances),
    }))
    .filter((entry) => entry.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

export function getMonthlyTotals(transactions: Transaction[]) {
  const totals = new Map<string, { debt: number; payment: number }>();

  for (const transaction of transactions) {
    const month = transaction.date.substring(0, 7);
    const current = totals.get(month) ?? { debt: 0, payment: 0 };
    if (transaction.type === "debt") current.debt += transaction.amount;
    else current.payment += transaction.amount;
    totals.set(month, current);
  }

  return [...totals.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);
}
