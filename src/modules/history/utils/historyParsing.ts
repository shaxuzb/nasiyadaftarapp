/**
 * The "Tarix" section's answers (GET /api/history/...), read defensively:
 * a row that cannot be shown is dropped, never shown half-read. Pure: no
 * React Native, so it is tested on its own.
 */

export interface Page<T> {
  count: number;
  results: T[];
}

export interface DeletedClient {
  id: number;
  fullName: string;
  phoneNumber: string;
  note: string;
  /** What the customer owed when deleted. */
  currentBalance: number;
  currencyCode: string | null;
  createdDate: string | null;
  /** Null for a customer deleted before deletions were dated. */
  deletedDate: string | null;
  deletedByUserName: string | null;
  transactionsCount: number;
}

export interface DeletedClientTransaction {
  id: number;
  type: "debt" | "payment";
  amount: number;
  date: string;
  note: string;
  dueDate: string | null;
}

export interface DeletedClientDetail {
  client: DeletedClient;
  totalDebt: number;
  totalPayment: number;
  transactions: DeletedClientTransaction[];
}

export type PurchaseKind = "subscription" | "sms_package";

export interface Purchase {
  kind: PurchaseKind;
  name: string;
  amount: number;
  provider: string | null;
  /** "gift": given by an admin or a promotion; the amount may be 0. */
  source: "purchase" | "gift";
  date: string | null;
  startAt: string | null;
  endAt: string | null;
  smsCount: number | null;
}

export interface OrganizationChange {
  id: number;
  /**
   * client_deleted, name_changed, address_changed, currency_changed,
   * blacklist_days_changed; kept as sent, so a type this build does not know
   * still shows, plainly.
   */
  type: string;
  clientId: number | null;
  oldValue: string;
  newValue: string;
  userName: string | null;
  date: string | null;
}

type Item = Record<string, unknown>;

function record(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Item) : {};
}

function finite(value: unknown): number | null {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

function positiveId(value: unknown): number | null {
  const id = finite(value);
  return id !== null && Number.isSafeInteger(id) && id > 0 ? id : null;
}

function text(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function nullableText(value: unknown): string | null {
  const result = text(value).trim();
  return result ? result : null;
}

function day(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const result = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : null;
}

function page<T>(input: unknown, read: (value: unknown) => T | null): Page<T> {
  const body = record(input);
  const raw = Array.isArray(input) ? input : Array.isArray(body.results) ? body.results : [];
  const results = raw.flatMap((value) => {
    const item = read(value);
    return item === null ? [] : [item];
  });
  const count = finite(body.count);
  return { count: count !== null && count >= 0 ? count : results.length, results };
}

function readDeletedClient(value: unknown): DeletedClient | null {
  const item = record(value);
  const id = positiveId(item.id ?? item.clientId);
  if (!id) return null;
  return {
    id,
    fullName: text(item.fullName).trim(),
    phoneNumber: text(item.phoneNumber),
    note: text(item.note),
    currentBalance: finite(item.currentBalance) ?? 0,
    currencyCode: nullableText(item.currencyCode),
    createdDate: nullableText(item.createdDate),
    deletedDate: nullableText(item.deletedDate),
    deletedByUserName: nullableText(item.deletedByUserName),
    transactionsCount: Math.max(0, Math.trunc(finite(item.transactionsCount) ?? 0)),
  };
}

function readTransaction(value: unknown, index: number): DeletedClientTransaction | null {
  const item = record(value);
  const type = text(item.type).toLowerCase();
  const amount = finite(item.amount);
  if ((type !== "debt" && type !== "payment") || amount === null) return null;
  return {
    // A row without an id still needs a stable key; they come in order.
    id: positiveId(item.id) ?? -(index + 1),
    type,
    amount,
    date: text(item.date),
    note: text(item.note),
    dueDate: type === "debt" ? day(item.dueDate) : null,
  };
}

function readPurchase(value: unknown): Purchase | null {
  const item = record(value);
  const kind = text(item.kind).toLowerCase();
  if (kind !== "subscription" && kind !== "sms_package") return null;
  const smsCount = finite(item.smsCount);
  return {
    kind,
    name: text(item.name).trim(),
    amount: finite(item.amount) ?? 0,
    provider: nullableText(item.provider),
    source: text(item.source).toLowerCase() === "gift" ? "gift" : "purchase",
    date: nullableText(item.date),
    startAt: nullableText(item.startAt),
    endAt: nullableText(item.endAt),
    smsCount: smsCount !== null && smsCount > 0 ? Math.trunc(smsCount) : null,
  };
}

function readOrganizationChange(value: unknown): OrganizationChange | null {
  const item = record(value);
  const id = positiveId(item.id);
  const type = text(item.type).trim().toLowerCase();
  if (!id || !type) return null;
  return {
    id,
    type,
    clientId: positiveId(item.clientId),
    oldValue: text(item.oldValue),
    newValue: text(item.newValue),
    userName: nullableText(item.userName),
    date: nullableText(item.date),
  };
}

export const parseDeletedClients = (input: unknown) => page(input, readDeletedClient);
export const parsePurchases = (input: unknown) => page(input, readPurchase);
export const parseOrganizationChanges = (input: unknown) => page(input, readOrganizationChange);

export function parseDeletedClientDetail(input: unknown): DeletedClientDetail | null {
  const body = record(input);
  const client = readDeletedClient(body.client);
  if (!client) return null;
  const raw = Array.isArray(body.transactions) ? body.transactions : [];
  const transactions = raw.flatMap((value, index) => {
    const item = readTransaction(value, index);
    return item ? [item] : [];
  });
  return {
    client,
    totalDebt: finite(body.totalDebt) ?? 0,
    totalPayment: finite(body.totalPayment) ?? 0,
    // Newest first, as in a live customer's history.
    transactions: transactions.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
  };
}

/** The next page to ask for, or undefined once everything is loaded. */
export function nextPageParam<T>(lastPage: Page<T>, pages: readonly Page<T>[]): number | undefined {
  const loaded = pages.reduce((total, item) => total + item.results.length, 0);
  return lastPage.results.length > 0 && loaded < lastPage.count ? pages.length + 1 : undefined;
}
