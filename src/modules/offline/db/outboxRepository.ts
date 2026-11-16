import { useSyncExternalStore } from "react";
import { and, asc, eq, inArray } from "drizzle-orm";
import * as Crypto from "expo-crypto";

import type { PushPlan } from "../sync/syncParsing";
import type {
  ClientCreateData,
  OutboxMeta,
  OutboxOperation,
  OutboxOperationType,
  OutboxStatus,
  TransactionCreateData,
} from "../sync/syncTypes";
import { getOfflineDatabase } from "./database";
import { outbox } from "./schema";

/**
 * The queue of writes made while the server could not be reached, in the
 * order made. Kept in the database (it survives the app closing and signing
 * out) and mirrored in memory for the signed-in user, so screens read it
 * without a query on every render.
 */

let loadedUserId: number | null = null;
let operations: readonly OutboxOperation[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function toOperation(row: typeof outbox.$inferSelect): OutboxOperation {
  return {
    seq: row.seq,
    opId: row.opId,
    userId: row.userId,
    organizationId: row.organizationId,
    type: row.type as OutboxOperationType,
    data: JSON.parse(row.data) as ClientCreateData | TransactionCreateData,
    meta: JSON.parse(row.meta) as OutboxMeta,
    occurredAt: row.occurredAt,
    status: row.status as OutboxStatus,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
  };
}

/** The signed-in user's queue, read again into memory. */
export async function loadOutbox(userId: number | null): Promise<void> {
  loadedUserId = userId;
  if (userId === null) {
    operations = [];
    emit();
    return;
  }
  try {
    const db = await getOfflineDatabase();
    // Refused writes are let go (kept marked by earlier versions): never sent, never shown.
    db?.delete(outbox).where(and(eq(outbox.userId, userId), eq(outbox.status, "rejected"))).run();
    const rows = db
      ? db.select().from(outbox).where(eq(outbox.userId, userId)).orderBy(asc(outbox.seq)).all()
      : [];
    // Another user may have signed in while this was being read.
    if (loadedUserId !== userId) return;
    operations = rows.map(toOperation);
  } catch (error) {
    if (__DEV__) console.warn("Offline queue could not be read", error);
    operations = [];
  }
  emit();
}

/** The time a write was made, in the phone's own offset ("…T10:15:00+05:00"). */
export function localIsoNow(date = new Date()): string {
  const pad = (value: number) => String(Math.trunc(Math.abs(value))).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

export interface NewOperation {
  userId: number;
  organizationId: number;
  type: OutboxOperationType;
  data: ClientCreateData | TransactionCreateData;
  meta: OutboxMeta;
}

/**
 * A write into the queue. Throws only when the phone cannot store it at all:
 * then nothing was saved and the user is told so, never shown a false "saved".
 */
export async function enqueueOperation(input: NewOperation): Promise<OutboxOperation> {
  const db = await getOfflineDatabase();
  if (!db) throw new Error("Offline queue is unavailable");
  const row = {
    opId: Crypto.randomUUID(),
    userId: input.userId,
    organizationId: input.organizationId,
    type: input.type,
    data: JSON.stringify(input.data),
    meta: JSON.stringify(input.meta),
    occurredAt: localIsoNow(),
    status: "pending" as const,
    errorCode: null,
    errorMessage: null,
    createdAt: Date.now(),
  };
  const inserted = db.insert(outbox).values(row).returning().get();
  const operation = toOperation(inserted);
  if (loadedUserId === input.userId) {
    operations = [...operations, operation];
    emit();
  }
  return operation;
}

/** What is still to be sent for this user, in the order written. */
export async function getPendingOperations(userId: number): Promise<OutboxOperation[]> {
  const db = await getOfflineDatabase();
  if (!db) return [];
  return db.select().from(outbox)
    .where(and(eq(outbox.userId, userId), eq(outbox.status, "pending")))
    .orderBy(asc(outbox.seq)).all().map(toOperation);
}

/**
 * The server's answers into the queue: every write it answered leaves it,
 * kept or refused alike. A refused one is let go quietly (the user's choice):
 * resending it would only be refused again, and it must not hold the queue.
 */
export async function applyPushPlanToOutbox(userId: number, plan: PushPlan): Promise<void> {
  const db = await getOfflineDatabase();
  if (!db) return;
  const answered = [...plan.done, ...plan.rejected.map((item) => item.opId)];
  if (answered.length) db.delete(outbox).where(inArray(outbox.opId, answered)).run();
  if (__DEV__ && plan.rejected.length) console.warn("Offline writes refused by the server", plan.rejected);
  await loadOutbox(userId);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => operations;

export function getOutboxOperations(): readonly OutboxOperation[] {
  return operations;
}

/** The signed-in user's queue; re-renders when it changes. */
export function useOutbox(): readonly OutboxOperation[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
