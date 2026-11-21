import type { Customer } from "../../clients/types";
import type { Transaction } from "../../transactions/types";
import type { ClientCreateData, OutboxOperation, TransactionCreateData } from "./syncTypes";

/**
 * What is written on the phone but not yet on the server, laid over what the
 * screens show: a customer added offline is in the list, and a debt or
 * payment recorded offline is in the history and in the balance. The server's
 * numbers win again once it has the writes. Only operations still waiting
 * count; a refused one changes nothing on screen (it is listed apart).
 */

const signed = (data: TransactionCreateData) => (data.type === "debt" ? data.amount : -data.amount);

function waiting(operations: readonly OutboxOperation[]) {
  return operations.filter((operation) => operation.status === "pending");
}

/** Whether a waiting debt or payment belongs to this customer. */
export function isForCustomer(operation: OutboxOperation, customer: Pick<Customer, "id" | "uuid">): boolean {
  if (operation.type !== "transaction.create") return false;
  const data = operation.data as TransactionCreateData;
  if (customer.id < 0) return operation.meta.clientTempId === customer.id;
  return (
    (Boolean(customer.uuid) && data.clientUuid === customer.uuid) ||
    data.clientId === customer.id
  );
}

/** A customer added offline, as the screens show it until the server has it. */
export function customerFromOperation(operation: OutboxOperation): Customer {
  const data = operation.data as ClientCreateData;
  return {
    id: operation.meta.tempId ?? -operation.seq,
    uuid: data.uuid,
    fullName: data.fullName,
    phone: data.phoneNumber,
    note: data.note,
    createdAt: operation.occurredAt,
    currentBalance: data.initialBalance ?? 0,
    isBlacklisted: false,
    overdueBalance: 0,
    blacklistedOrganizationCount: 0,
    blacklistedOrganizations: [],
    pendingSync: true,
  };
}

/** The list with the customers added offline, and every waiting write in its balance. */
export function applyPendingToCustomers(
  customers: readonly Customer[],
  operations: readonly OutboxOperation[],
): Customer[] {
  const pending = waiting(operations);
  if (pending.length === 0) return customers as Customer[];

  const known = new Set(customers.map((customer) => customer.uuid).filter(Boolean));
  const added = pending
    .filter((operation) => operation.type === "client.create")
    .map(customerFromOperation)
    // Already on the server's list (sent, but the list was read before the
    // queue was cleared): the server's copy is the one kept.
    .filter((customer) => !known.has(customer.uuid));

  const transactions = pending.filter((operation) => operation.type === "transaction.create");
  const withBalances = [...added, ...customers].map((customer) => {
    const own = transactions.filter((operation) => isForCustomer(operation, customer));
    if (own.length === 0) return customer;
    const delta = own.reduce((sum, operation) => sum + signed(operation.data as TransactionCreateData), 0);
    return {
      ...customer,
      currentBalance: customer.currentBalance === undefined ? undefined : customer.currentBalance + delta,
      pendingSync: true,
    };
  });
  return withBalances;
}

/** One customer, with its waiting writes. */
export function applyPendingToCustomer(customer: Customer, operations: readonly OutboxOperation[]): Customer {
  return applyPendingToCustomers([customer], operations).find((item) => item.id === customer.id) ?? customer;
}

/** A customer's history with the debts and payments still waiting, newest first. */
export function applyPendingToHistory(
  history: readonly Transaction[],
  operations: readonly OutboxOperation[],
  customer: Pick<Customer, "id" | "uuid">,
): Transaction[] {
  const own = waiting(operations).filter((operation) => isForCustomer(operation, customer));
  if (own.length === 0) return history as Transaction[];
  const known = new Set(history.map((transaction) => transaction.uuid).filter(Boolean));
  const extra = own
    .map((operation): Transaction => {
      const data = operation.data as TransactionCreateData;
      return {
        id: -operation.seq,
        customerId: customer.id,
        type: data.type,
        amount: data.amount,
        date: data.date ?? operation.occurredAt.slice(0, 10),
        note: data.note,
        ...(data.dueDate ? { dueDate: data.dueDate } : {}),
        uuid: data.uuid,
        pendingSync: true,
      };
    })
    .filter((transaction) => !known.has(transaction.uuid))
    .reverse();
  return [...extra, ...history];
}

/** The part of the report the waiting writes change. */
export interface ReportOverlayTarget {
  remainingBalance: number;
  topDebtors: { clientId: number; fullName: string; phoneNumber: string; balance: number }[];
}

/**
 * The report with the waiting writes in it: the remaining balance moves by
 * each debt (+), payment (−) and a customer's opening balance, and the top
 * debtors are ranked again with the balances the phone has. `customers` is
 * the list with the waiting writes already in it (applyPendingToCustomers);
 * a debtor missing from it is moved by its own writes alone.
 */
export function applyPendingToReport<T extends ReportOverlayTarget>(
  report: T,
  operations: readonly OutboxOperation[],
  customers: readonly Customer[],
  limit: number,
): T {
  const pending = waiting(operations);
  if (pending.length === 0) return report;

  let delta = 0;
  for (const operation of pending) {
    delta +=
      operation.type === "transaction.create"
        ? signed(operation.data as TransactionCreateData)
        : ((operation.data as ClientCreateData).initialBalance ?? 0);
  }

  const touched = new Map<number, Customer>();
  for (const customer of customers) if (customer.pendingSync) touched.set(customer.id, customer);

  const debtors = report.topDebtors
    .filter((debtor) => !touched.has(debtor.clientId))
    .map((debtor) => {
      const own = pending.filter((operation) => isForCustomer(operation, { id: debtor.clientId, uuid: undefined }));
      if (own.length === 0) return debtor;
      const change = own.reduce((sum, operation) => sum + signed(operation.data as TransactionCreateData), 0);
      return { ...debtor, balance: debtor.balance + change };
    });
  for (const customer of touched.values()) {
    if (customer.currentBalance === undefined) continue;
    debtors.push({
      clientId: customer.id,
      fullName: customer.fullName,
      phoneNumber: customer.phone,
      balance: customer.currentBalance,
    });
  }

  return {
    ...report,
    remainingBalance: report.remainingBalance + delta,
    topDebtors: debtors
      .filter((debtor) => debtor.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit),
  };
}
