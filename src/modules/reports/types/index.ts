export interface ReportTopDebtor {
  clientId: number;
  fullName: string;
  phoneNumber: string;
  balance: number;
}

export interface MonthlyStatistic {
  month: string;
  year: number;
  monthNumber: number;
  debt: number;
  payment: number;
  balance: number;
}

export interface ReportsResponse {
  totalDebt: number;
  totalPayment: number;
  remainingBalance: number;
  totalClients: number;
  activeDebtorsCount: number;
  debtFreeClientsCount: number;
  totalTransactions: number;
  paymentEfficiencyPercent: number;
  currentMonthDebt: number;
  currentMonthPayment: number;
  currentMonthBalance: number;
  topDebtors: ReportTopDebtor[];
  monthlyStatistics: MonthlyStatistic[];
  /** Made on the phone while the server is down: only the total is real. */
  computedOnPhone?: boolean;
}

export interface ReportsQueryParams {
  months: number;
  topDebtorsLimit: number;
}
