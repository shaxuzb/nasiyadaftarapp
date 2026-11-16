import type { ReportsResponse } from "../types";

/**
 * The report the phone can make on its own while the server is down: the
 * total still owed, from every customer's balance brought down by sync.
 * Only that: the rest of a report (top debtors, months) is the server's.
 */
export function reportFromSavedCustomers(
  customers: readonly { currentBalance?: number | null }[],
): ReportsResponse {
  let remainingBalance = 0;
  let activeDebtorsCount = 0;
  for (const customer of customers) {
    const balance = Number.isFinite(customer.currentBalance) ? Number(customer.currentBalance) : 0;
    remainingBalance += balance;
    if (balance > 0) activeDebtorsCount += 1;
  }
  return {
    totalDebt: 0,
    totalPayment: 0,
    remainingBalance: Math.round(remainingBalance * 100) / 100,
    totalClients: customers.length,
    activeDebtorsCount,
    debtFreeClientsCount: customers.length - activeDebtorsCount,
    totalTransactions: 0,
    paymentEfficiencyPercent: 0,
    currentMonthDebt: 0,
    currentMonthPayment: 0,
    currentMonthBalance: 0,
    topDebtors: [],
    monthlyStatistics: [],
    computedOnPhone: true,
  };
}
