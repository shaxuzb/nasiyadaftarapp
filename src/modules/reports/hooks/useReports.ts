import { useMemo } from "react";
import { Customer } from "../../clients/types";
import { Transaction } from "../../transactions/types";
import {
  getDashboardStats,
  getMonthlyTotals,
  getTopDebtors,
} from "../utils/reportCalculations";

export function useReports(
  customers: Customer[],
  transactions: Transaction[],
) {
  const stats = useMemo(
    () => getDashboardStats(customers, transactions),
    [customers, transactions],
  );
  const topDebtors = useMemo(
    () => getTopDebtors(customers, transactions),
    [customers, transactions],
  );
  const monthlyMap = useMemo(
    () => getMonthlyTotals(transactions),
    [transactions],
  );

  return { stats, topDebtors, monthlyMap };
}
