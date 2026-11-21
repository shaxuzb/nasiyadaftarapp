import { and, eq, inArray, like } from "drizzle-orm";

import type { Customer } from "../../clients/types";
import type { Transaction } from "../../transactions/types";
import type { ChangesPage, SyncedClient, SyncedTransaction } from "../sync/syncTypes";
import {
  customerSearchText,
  fingerprint,
  toLikePattern,
  type Saved,
} from "../utils/savedData";
import type { QueryScope } from "../../../core/query/queryKeys";
import { getOfflineDatabase } from "./database";
import { clientAliases, clients, snapshots, transactions } from "./schema";

/**
 * Reading and writing the device's copy. Nothing here throws: a copy that
 * cannot be saved or read only means the app works as it did without one.
 */

const CLIENTS_LIST_KEY = "clients:list";
const SYNC_CURSOR_KEY = "sync:cursor";
// SQLite takes at most 999 values per statement; seven columns a row.
const INSERT_CHUNK = 120;

// What was last written, per scope and key, so an unchanged answer (the list
// comes back every 30 seconds) is not written again.
const lastWritten = new Map<string, string>();

function changed(scope: string, key: string, json: string): boolean {
  const mark = `${scope}|${key}`;
  const print = fingerprint(json);
  if (lastWritten.get(mark) === print) return false;
  lastWritten.set(mark, print);
  return true;
}

/** After the screen has drawn: saving never holds up what the user sees. */
function later(task: () => Promise<void>): void {
  setTimeout(() => {
    void task().catch((error) => {
      if (__DEV__) console.warn("Offline copy could not be saved", error);
    });
  }, 0);
}

async function read<T>(task: () => Promise<T | null>): Promise<T | null> {
  try {
    return await task();
  } catch (error) {
    if (__DEV__) console.warn("Offline copy could not be read", error);
    return null;
  }
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

/** Newest first, as the history is shown: the day, then the id. */
function sortKey(transaction: Pick<Transaction, "date" | "id">): string {
  return `${transaction.date}|${String(Math.max(0, transaction.id)).padStart(12, "0")}`;
}

/** The key a debt or payment is kept under: its uuid, or its id for an older server. */
function transactionKey(transaction: Pick<Transaction, "uuid" | "id">): string {
  return transaction.uuid ?? `id:${transaction.id}`;
}

type Db = NonNullable<Awaited<ReturnType<typeof getOfflineDatabase>>>;

/**
 * When the phone's copy dates from: the last full list, or the last sync
 * (which brings every customer and every debt). Null: nothing kept yet.
 */
function copySavedAt(db: Db, scope: string): number | null {
  const marks = db.select({ savedAt: snapshots.savedAt }).from(snapshots)
    .where(and(eq(snapshots.scope, scope), inArray(snapshots.key, [CLIENTS_LIST_KEY, SYNC_CURSOR_KEY]))).all();
  return marks.length ? Math.max(...marks.map((mark) => mark.savedAt)) : null;
}

/* Customers. */

/** The whole list, as the server sent it, in place of the last one. */
export function saveCustomers(scopeId: QueryScope, customers: readonly Customer[]): void {
  const scope = String(scopeId);
  const json = JSON.stringify(customers);
  if (!changed(scope, CLIENTS_LIST_KEY, json)) return;
  later(async () => {
    const db = await getOfflineDatabase();
    if (!db) return;
    const savedAt = Date.now();
    const rows = customers.map((customer, position) => ({
      scope,
      id: customer.id,
      uuid: customer.uuid ?? null,
      searchText: customerSearchText(customer.fullName, customer.phone),
      position,
      data: JSON.stringify(customer),
      savedAt,
    }));
    db.transaction((tx) => {
      tx.delete(clients).where(eq(clients.scope, scope)).run();
      for (const part of chunks(rows, INSERT_CHUNK)) tx.insert(clients).values(part).run();
      tx.insert(snapshots)
        .values({ scope, key: CLIENTS_LIST_KEY, data: "{}", savedAt })
        .onConflictDoUpdate({ target: [snapshots.scope, snapshots.key], set: { savedAt } })
        .run();
    });
  });
}

export function loadCustomers(scopeId: QueryScope): Promise<Saved<Customer[]> | null> {
  const scope = String(scopeId);
  return read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    const savedAt = copySavedAt(db, scope);
    if (savedAt === null) return null;
    const rows = db.select({ data: clients.data }).from(clients).where(eq(clients.scope, scope)).all();
    return { data: rows.map((row) => JSON.parse(row.data) as Customer), savedAt };
  });
}

/** Customers whose name or phone contains the query. */
export function searchSavedCustomers(scopeId: QueryScope, query: string): Promise<Saved<Customer[]> | null> {
  const scope = String(scopeId);
  return read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    const savedAt = copySavedAt(db, scope);
    if (savedAt === null) return null;
    const rows = db.select({ data: clients.data }).from(clients)
      .where(and(eq(clients.scope, scope), like(clients.searchText, toLikePattern(query)))).all();
    return { data: rows.map((row) => JSON.parse(row.data) as Customer), savedAt };
  });
}

/** One customer, fresh from their own page, into the copy. */
export function saveCustomer(scopeId: QueryScope, customer: Customer): void {
  if (customer.id <= 0) return;
  const scope = String(scopeId);
  const json = JSON.stringify(customer);
  if (!changed(scope, `client:${customer.id}`, json)) return;
  later(async () => {
    const db = await getOfflineDatabase();
    if (!db) return;
    const searchText = customerSearchText(customer.fullName, customer.phone);
    const savedAt = Date.now();
    db.insert(clients)
      .values({ scope, id: customer.id, uuid: customer.uuid ?? null, searchText, position: -1, data: json, savedAt })
      .onConflictDoUpdate({
        target: [clients.scope, clients.id],
        set: { uuid: customer.uuid ?? null, searchText, data: json, savedAt },
      })
      .run();
  });
}

export function loadCustomer(scopeId: QueryScope, id: number): Promise<Saved<Customer> | null> {
  const scope = String(scopeId);
  return read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    const row = db.select().from(clients).where(and(eq(clients.scope, scope), eq(clients.id, id))).get();
    return row ? { data: JSON.parse(row.data) as Customer, savedAt: row.savedAt } : null;
  });
}

/* A customer's history. */

/** The customer's whole history, as the server sent it, in place of what was kept. */
export function saveHistory(scopeId: QueryScope, clientId: number, history: readonly Transaction[]): void {
  if (clientId <= 0) return;
  const scope = String(scopeId);
  const json = JSON.stringify(history);
  if (!changed(scope, `history:${clientId}`, json)) return;
  later(async () => {
    const db = await getOfflineDatabase();
    if (!db) return;
    const savedAt = Date.now();
    const rows = history.map((transaction) => ({
      scope,
      uuid: transactionKey(transaction),
      clientId,
      clientUuid: null,
      sortKey: sortKey(transaction),
      data: JSON.stringify(transaction),
      savedAt,
    }));
    db.transaction((tx) => {
      tx.delete(transactions).where(and(eq(transactions.scope, scope), eq(transactions.clientId, clientId))).run();
      for (const part of chunks(rows, INSERT_CHUNK)) {
        tx.insert(transactions).values(part).onConflictDoNothing().run();
      }
      // An empty history is a fact too: kept as a mark, so it reads back as empty.
      tx.insert(snapshots)
        .values({ scope, key: `history:${clientId}`, data: "{}", savedAt })
        .onConflictDoUpdate({ target: [snapshots.scope, snapshots.key], set: { savedAt } })
        .run();
    });
  });
}

export function loadHistory(scopeId: QueryScope, clientId: number): Promise<Saved<Transaction[]> | null> {
  const scope = String(scopeId);
  return read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    const mark = db.select({ savedAt: snapshots.savedAt }).from(snapshots)
      .where(and(eq(snapshots.scope, scope), eq(snapshots.key, `history:${clientId}`))).get();
    // Kept on its own, or with every other one by a sync.
    const savedAt = mark?.savedAt ?? (db.select({ savedAt: snapshots.savedAt }).from(snapshots)
      .where(and(eq(snapshots.scope, scope), eq(snapshots.key, SYNC_CURSOR_KEY))).get()?.savedAt ?? null);
    if (savedAt === null) return null;
    const rows = db.select({ data: transactions.data }).from(transactions)
      .where(and(eq(transactions.scope, scope), eq(transactions.clientId, clientId))).all();
    return { data: rows.map((row) => JSON.parse(row.data) as Transaction), savedAt };
  });
}

/* Whole answers: a report. */

export function saveSnapshot(scopeId: QueryScope, key: string, value: unknown): void {
  const scope = String(scopeId);
  const json = JSON.stringify(value);
  if (!changed(scope, key, json)) return;
  later(async () => {
    const db = await getOfflineDatabase();
    if (!db) return;
    const savedAt = Date.now();
    db.insert(snapshots)
      .values({ scope, key, data: json, savedAt })
      .onConflictDoUpdate({ target: [snapshots.scope, snapshots.key], set: { data: json, savedAt } })
      .run();
  });
}

export function loadSnapshot<T>(scopeId: QueryScope, key: string): Promise<Saved<T> | null> {
  const scope = String(scopeId);
  return read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    const row = db.select().from(snapshots).where(and(eq(snapshots.scope, scope), eq(snapshots.key, key))).get();
    return row ? { data: JSON.parse(row.data) as T, savedAt: row.savedAt } : null;
  });
}

/* Sync: the server's changes. */

export async function getSyncCursor(scopeId: QueryScope): Promise<string | null> {
  const scope = String(scopeId);
  const row = await read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    return db.select({ data: snapshots.data }).from(snapshots)
      .where(and(eq(snapshots.scope, scope), eq(snapshots.key, SYNC_CURSOR_KEY))).get() ?? null;
  });
  const cursor = row ? (JSON.parse(row.data) as { cursor?: unknown }).cursor : null;
  return typeof cursor === "string" && cursor ? cursor : null;
}

function customerFromSync(item: SyncedClient, existing: Customer | null): Customer {
  return {
    // What changes do not carry (overdue, blacklist) stays as last read in full.
    isBlacklisted: false,
    overdueBalance: 0,
    blacklistedOrganizationCount: 0,
    blacklistedOrganizations: [],
    ...existing,
    id: item.id,
    uuid: item.uuid,
    fullName: item.fullName,
    phone: item.phone,
    note: item.note,
    createdAt: item.createdAt ?? existing?.createdAt,
    currentBalance: item.currentBalance ?? existing?.currentBalance,
  };
}

function transactionFromSync(item: SyncedTransaction): Transaction {
  return {
    id: item.id,
    customerId: item.clientId,
    type: item.type,
    amount: item.amount,
    date: item.date,
    note: item.note,
    ...(item.dueDate ? { dueDate: item.dueDate } : {}),
    uuid: item.uuid,
  };
}

/**
 * One page of the server's changes into the copy, all or nothing: customers
 * and debts by uuid, the deleted customers gone with their debts, and the
 * cursor to ask from next time.
 */
export async function applyChangesPage(scopeId: QueryScope, page: ChangesPage): Promise<void> {
  const scope = String(scopeId);
  const db = await getOfflineDatabase();
  if (!db) throw new Error("Offline database is unavailable");
  const savedAt = Date.now();

  // The customers already kept, to keep what changes do not carry.
  const existing = new Map<number, Customer>();
  for (const part of chunks(page.clients.map((item) => item.id), 500)) {
    for (const row of db.select({ id: clients.id, data: clients.data }).from(clients)
      .where(and(eq(clients.scope, scope), inArray(clients.id, part))).all()) {
      existing.set(row.id, JSON.parse(row.data) as Customer);
    }
  }

  db.transaction((tx) => {
    for (const item of page.clients) {
      const customer = customerFromSync(item, existing.get(item.id) ?? null);
      const searchText = customerSearchText(customer.fullName, customer.phone);
      const data = JSON.stringify(customer);
      tx.insert(clients)
        .values({ scope, id: item.id, uuid: item.uuid, searchText, position: -1, data, savedAt })
        .onConflictDoUpdate({ target: [clients.scope, clients.id], set: { uuid: item.uuid, searchText, data, savedAt } })
        .run();
    }
    const rows = page.transactions.map((item) => {
      const transaction = transactionFromSync(item);
      return {
        scope,
        uuid: item.uuid,
        clientId: item.clientId,
        clientUuid: item.clientUuid,
        sortKey: sortKey(transaction),
        data: JSON.stringify(transaction),
        savedAt,
      };
    });
    for (const part of chunks(rows, INSERT_CHUNK)) {
      tx.insert(transactions).values(part)
        .onConflictDoUpdate({
          target: [transactions.scope, transactions.uuid],
          set: { clientId: transactions.clientId, data: transactions.data, savedAt },
        })
        .run();
    }
    for (const part of chunks(page.deletedClientUuids, 500)) {
      const gone = tx.select({ id: clients.id }).from(clients)
        .where(and(eq(clients.scope, scope), inArray(clients.uuid, part))).all().map((row) => row.id);
      tx.delete(clients).where(and(eq(clients.scope, scope), inArray(clients.uuid, part))).run();
      tx.delete(transactions).where(and(eq(transactions.scope, scope), inArray(transactions.clientUuid, part))).run();
      if (gone.length) tx.delete(transactions).where(and(eq(transactions.scope, scope), inArray(transactions.clientId, gone))).run();
    }
    if (page.cursor) {
      const data = JSON.stringify({ cursor: page.cursor });
      tx.insert(snapshots)
        .values({ scope, key: SYNC_CURSOR_KEY, data, savedAt })
        .onConflictDoUpdate({ target: [snapshots.scope, snapshots.key], set: { data, savedAt } })
        .run();
    }
  });
  // What was written is no longer what the next full read should skip.
  for (const key of [...lastWritten.keys()]) if (key.startsWith(`${scope}|`)) lastWritten.delete(key);
}

/** The organization's copy, emptied, to be loaded again from the start. */
export async function clearScope(scopeId: QueryScope): Promise<void> {
  const scope = String(scopeId);
  for (const key of [...lastWritten.keys()]) if (key.startsWith(`${scope}|`)) lastWritten.delete(key);
  const db = await getOfflineDatabase();
  if (!db) return;
  db.transaction((tx) => {
    tx.delete(clients).where(eq(clients.scope, scope)).run();
    tx.delete(transactions).where(eq(transactions.scope, scope)).run();
    tx.delete(snapshots).where(eq(snapshots.scope, scope)).run();
  });
}

/* A customer added offline, once the server has it. */

export async function saveClientAlias(scopeId: QueryScope, tempId: number, serverId: number, serverUuid: string) {
  const scope = String(scopeId);
  const db = await getOfflineDatabase();
  if (!db) return;
  db.insert(clientAliases)
    .values({ scope, tempId, serverId, serverUuid })
    .onConflictDoUpdate({ target: [clientAliases.scope, clientAliases.tempId], set: { serverId, serverUuid } })
    .run();
}

export function loadClientAlias(scopeId: QueryScope, tempId: number): Promise<{ serverId: number; serverUuid: string } | null> {
  const scope = String(scopeId);
  return read(async () => {
    const db = await getOfflineDatabase();
    if (!db) return null;
    return db.select({ serverId: clientAliases.serverId, serverUuid: clientAliases.serverUuid })
      .from(clientAliases).where(and(eq(clientAliases.scope, scope), eq(clientAliases.tempId, tempId))).get() ?? null;
  });
}

/**
 * Everything kept from the server, on signing out: the next person on this
 * phone sees nothing of it. The queue of unsent writes stays (it belongs to
 * its user and is sent when they are back).
 */
export async function clearSavedData(): Promise<void> {
  lastWritten.clear();
  try {
    const db = await getOfflineDatabase();
    if (!db) return;
    db.transaction((tx) => {
      tx.delete(clients).run();
      tx.delete(transactions).run();
      tx.delete(snapshots).run();
      tx.delete(clientAliases).run();
    });
  } catch (error) {
    if (__DEV__) console.warn("Offline copy could not be cleared", error);
  }
}
