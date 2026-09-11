import { apiClient } from "../../../services/axiosService";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import {
  MonthlyStatistic,
  ReportTopDebtor,
  ReportsQueryParams,
  ReportsResponse,
} from "../types";

const DEFAULT_REPORTS_PARAMS: ReportsQueryParams = {
  months: 6,
  topDebtorsLimit: 5,
};

function asFiniteNumber(value: unknown, field: string): number {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new Error(`Invalid reports field: ${field}`);
  }
  return numberValue;
}

function asFiniteNumberOrDefault(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function asNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid reports field: ${field}`);
  }
  return value;
}

function parseTopDebtor(value: unknown, index: number): ReportTopDebtor {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid reports field: topDebtors[${index}]`);
  }

  const item = value as Record<string, unknown>;
  return {
    clientId: asFiniteNumber(item.clientId, `topDebtors[${index}].clientId`),
    fullName: asNonEmptyString(item.fullName, `topDebtors[${index}].fullName`),
    phoneNumber: asNonEmptyString(
      item.phoneNumber,
      `topDebtors[${index}].phoneNumber`,
    ),
    balance: asFiniteNumber(item.balance, `topDebtors[${index}].balance`),
  };
}

function parseMonthlyStatistic(
  value: unknown,
  index: number,
): MonthlyStatistic {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid reports field: monthlyStatistics[${index}]`);
  }

  const item = value as Record<string, unknown>;
  return {
    month: asNonEmptyString(item.month, `monthlyStatistics[${index}].month`),
    year: asFiniteNumber(item.year, `monthlyStatistics[${index}].year`),
    monthNumber: asFiniteNumber(
      item.monthNumber,
      `monthlyStatistics[${index}].monthNumber`,
    ),
    debt: asFiniteNumber(item.debt, `monthlyStatistics[${index}].debt`),
    payment: asFiniteNumber(
      item.payment,
      `monthlyStatistics[${index}].payment`,
    ),
    balance: asFiniteNumber(
      item.balance,
      `monthlyStatistics[${index}].balance`,
    ),
  };
}

function parseReportsResponse(value: unknown): ReportsResponse {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid reports response");
  }

  const data = value as Record<string, unknown>;
  const topDebtors = data.topDebtors;
  const monthlyStatistics = data.monthlyStatistics;

  if (!Array.isArray(topDebtors)) {
    throw new Error("Invalid reports field: topDebtors");
  }

  const totalDebt = asFiniteNumber(data.totalDebt, "totalDebt");
  const totalPayment = asFiniteNumber(data.totalPayment, "totalPayment");
  const remainingBalance = asFiniteNumber(
    data.remainingBalance,
    "remainingBalance",
  );
  const paymentEfficiencyPercent = asFiniteNumberOrDefault(
    data.paymentEfficiencyPercent,
    totalDebt > 0 ? (totalPayment / totalDebt) * 100 : 0,
  );

  return {
    totalDebt,
    totalPayment,
    remainingBalance,
    totalClients: asFiniteNumberOrDefault(data.totalClients, 0),
    activeDebtorsCount: asFiniteNumberOrDefault(data.activeDebtorsCount, 0),
    debtFreeClientsCount: asFiniteNumberOrDefault(data.debtFreeClientsCount, 0),
    totalTransactions: asFiniteNumberOrDefault(data.totalTransactions, 0),
    paymentEfficiencyPercent,
    currentMonthDebt: asFiniteNumberOrDefault(data.currentMonthDebt, totalDebt),
    currentMonthPayment: asFiniteNumberOrDefault(
      data.currentMonthPayment,
      totalPayment,
    ),
    currentMonthBalance: asFiniteNumberOrDefault(
      data.currentMonthBalance,
      remainingBalance,
    ),
    topDebtors: topDebtors.map(parseTopDebtor),
    monthlyStatistics: Array.isArray(monthlyStatistics)
      ? monthlyStatistics.map(parseMonthlyStatistic)
      : [],
  };
}

export async function getReports(
  params: Partial<ReportsQueryParams> = {},
): Promise<ReportsResponse> {
  const requestParams = {
    ...DEFAULT_REPORTS_PARAMS,
    ...params,
  };
  const { data } = await apiClient.get<unknown>("/reports", {
    params: requestParams,
  });

  return parseReportsResponse(data);
}

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function createExportFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `mijozlar-hisoboti-${timestamp}.xlsx`;
}

/** Downloads the currently selected organization's client report and opens the native save/share sheet. */
export async function exportClientsReport(
  dialogTitle = "Mijozlar hisoboti",
): Promise<string> {
  // `apiClient` retains the application's token refresh/error behavior.
  const { data } = await apiClient.get<ArrayBuffer>("/reports/export/clients", {
    responseType: "arraybuffer",
    headers: { Accept: EXCEL_MIME_TYPE },
  });
  const file = new File(Paths.cache, createExportFileName());
  file.create({ overwrite: true });
  file.write(new Uint8Array(data));

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Bu qurilmada faylni ulashish imkoniyati mavjud emas");
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle,
    mimeType: EXCEL_MIME_TYPE,
    UTI: "org.openxmlformats.spreadsheetml.sheet",
  });
  return file.uri;
}
