import { Customer, Transaction, DashboardStats, TransactionType } from '../types';

// ─── Formatting ─────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('uz-UZ', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  });
}

export function getFullName(customer: Customer): string {
  return `${customer.firstName} ${customer.lastName}`;
}

export function getInitials(customer: Customer): string {
  return `${customer.firstName[0]}${customer.lastName[0]}`.toUpperCase();
}

// ─── Transaction Utilities ──────────────────────────────────────

export function sortTransactionsNewest(txs: Transaction[]): Transaction[] {
  return [...txs].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getCustomerTransactions(
  customerId: number,
  transactions: Transaction[]
): Transaction[] {
  return sortTransactionsNewest(
    transactions.filter((t) => t.customerId === customerId)
  );
}

// ─── Balance Calculations ────────────────────────────────────────

export function getTotalDebt(
  customerId: number,
  transactions: Transaction[]
): number {
  return transactions
    .filter((t) => t.customerId === customerId && t.type === 'debt')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getTotalPayments(
  customerId: number,
  transactions: Transaction[]
): number {
  return transactions
    .filter((t) => t.customerId === customerId && t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getBalance(
  customerId: number,
  transactions: Transaction[]
): number {
  return getTotalDebt(customerId, transactions) -
         getTotalPayments(customerId, transactions);
}

// ─── Dashboard Statistics ────────────────────────────────────────

export function getDashboardStats(
  customers: Customer[],
  transactions: Transaction[]
): DashboardStats {
  const totalDebt = transactions
    .filter((t) => t.type === 'debt')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPaid = transactions
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + t.amount, 0);

  const remainingBalance = totalDebt - totalPaid;

  const activeDebtorsCount = customers.filter(
    (c) => getBalance(c.id, transactions) > 0
  ).length;

  return {
    totalDebt,
    totalPaid,
    remainingBalance,
    activeDebtorsCount,
    totalCustomers: customers.length,
  };
}

// ─── Top Debtors ─────────────────────────────────────────────────

export interface DebtorEntry {
  customer: Customer;
  balance: number;
}

export function getTopDebtors(
  customers: Customer[],
  transactions: Transaction[],
  limit = 5
): DebtorEntry[] {
  return customers
    .map((c) => ({ customer: c, balance: getBalance(c.id, transactions) }))
    .filter((e) => e.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

// ─── Recent Transactions ─────────────────────────────────────────

export function getRecentTransactions(
  transactions: Transaction[],
  limit = 8
): Transaction[] {
  return sortTransactionsNewest(transactions).slice(0, limit);
}

// ─── ID Generator ────────────────────────────────────────────────

export function generateId(items: { id: number }[]): number {
  if (items.length === 0) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

// ─── High Debt Threshold ─────────────────────────────────────────

export const HIGH_DEBT_THRESHOLD = 300_000;

export function isHighDebtor(balance: number): boolean {
  return balance >= HIGH_DEBT_THRESHOLD;
}

export type CustomerRisk = 'past' | 'orta' | 'yuqori';

export function getCustomerRisk(
  customerId: number,
  transactions: Transaction[]
): CustomerRisk {
  const txs = transactions
    .filter((t) => t.customerId === customerId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (txs.length === 0) return 'past';

  const debtCount = txs.filter((t) => t.type === 'debt').length;
  const paymentCount = txs.filter((t) => t.type === 'payment').length;
  const balance = getBalance(customerId, transactions);

  const paymentRatio = debtCount === 0 ? 1 : paymentCount / debtCount;
  const highBalance = balance >= HIGH_DEBT_THRESHOLD;

  if (highBalance && paymentRatio < 0.45) return 'yuqori';
  if (balance > 0 && paymentRatio < 0.75) return 'orta';
  return 'past';
}

export interface ParsedVoiceEntry {
  amount: number | null;
  type: TransactionType | null;
}

export function parseVoiceEntry(input: string): ParsedVoiceEntry {
  const text = input.trim().toLowerCase();
  if (!text) return { amount: null, type: null };

  const clean = text
    .replace(/to‘lov|toʻlov|to'lov/g, 'tolov')
    .replace(/so'm|sum|soum|som/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  let type: TransactionType | null = null;
  if (/\bnasiya\b|\bqarz\b/.test(clean)) type = 'debt';
  if (/\btolov\b|\btoladim\b|\bberdim\b/.test(clean)) type = 'payment';

  const numberMatch = clean.match(/(\d+(?:[.,]\d+)?)/);
  if (!numberMatch) return { amount: null, type };

  const raw = numberMatch[1].replace(',', '.');
  let amount = Number(raw);
  if (Number.isNaN(amount)) return { amount: null, type };

  if (/\bming\b/.test(clean)) amount *= 1_000;
  if (/\bmln\b|\bmillion\b/.test(clean)) amount *= 1_000_000;

  return { amount: Math.round(amount), type };
}
