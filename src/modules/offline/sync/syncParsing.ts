import type {
  ChangesPage,
  OutboxOperation,
  PushResult,
  PushStatus,
  SyncedClient,
  SyncedTransaction,
} from "./syncTypes";

/**
 * Reading the sync API's answers, and planning what to do with them. Pure:
 * no React Native, so it is tested on its own. An entry that cannot be read
 * is left out rather than trusted.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
const text = (value: unknown): string => (typeof value === "string" ? value : "");
const nullableText = (value: unknown): string | null => (typeof value === "string" && value ? value : null);
const positiveId = (value: unknown): number | null => {
  const id = typeof value === "string" ? Number(value) : value;
  return typeof id === "number" && Number.isInteger(id) && id > 0 ? id : null;
};
const finite = (value: unknown): number | null => {
  const number = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
};
const unwrap = (input: unknown): Record<string, unknown> => {
  const outer = record(input);
  const inner = record(outer.data);
  return Object.keys(inner).length ? inner : outer;
};

const PUSH_STATUSES: readonly PushStatus[] = ["applied", "duplicate", "merged", "rejected"];

/* POST /api/sync/push */

export function parsePushResponse(input: unknown): PushResult[] {
  const results = unwrap(input).results;
  if (!Array.isArray(results)) return [];
  return results.flatMap((value): PushResult[] => {
    const item = record(value);
    const opId = text(item.opId);
    const status = text(item.status).toLowerCase() as PushStatus;
    if (!opId || !PUSH_STATUSES.includes(status)) return [];
    const client = record(item.client);
    const clientId = positiveId(client.id);
    const transaction = record(item.transaction);
    const transactionId = positiveId(transaction.id);
    return [
      {
        opId,
        status,
        code: nullableText(item.code),
        message: nullableText(item.message),
        client:
          clientId && isUuid(client.uuid)
            ? { id: clientId, uuid: client.uuid, currentBalance: finite(client.currentBalance) }
            : null,
        transaction:
          transactionId && isUuid(transaction.uuid) ? { id: transactionId, uuid: transaction.uuid } : null,
      },
    ];
  });
}

/** What the push answers mean for the queue and the phone's copy. */
export interface PushPlan {
  /** Sent and kept by the server (applied, duplicate or merged): off the queue. */
  done: string[];
  /** Refused, with the server's reason: kept, shown to the user. */
  rejected: { opId: string; code: string; message: string }[];
  /**
   * Customers the server now knows: a customer added offline gets its real id
   * here, and for a merged one, the customer it was merged into.
   */
  clients: {
    localUuid: string | null;
    tempId: number | null;
    id: number;
    uuid: string;
    currentBalance: number | null;
  }[];
}

export function planPushResults(sent: readonly OutboxOperation[], results: readonly PushResult[]): PushPlan {
  const byOp = new Map(results.map((result) => [result.opId, result]));
  const plan: PushPlan = { done: [], rejected: [], clients: [] };
  for (const operation of sent) {
    const result = byOp.get(operation.opId);
    // No answer for it: it stays queued and goes again next time.
    if (!result) continue;
    if (result.status === "rejected") {
      plan.rejected.push({
        opId: operation.opId,
        code: result.code ?? "UNKNOWN",
        message: result.message ?? "",
      });
      continue;
    }
    plan.done.push(operation.opId);
    if (result.client) {
      plan.clients.push({
        localUuid: operation.type === "client.create" ? operation.data.uuid : null,
        tempId: operation.type === "client.create" ? operation.meta.tempId ?? null : operation.meta.clientTempId ?? null,
        id: result.client.id,
        uuid: result.client.uuid,
        currentBalance: result.client.currentBalance,
      });
    }
  }
  return plan;
}

/** The request body: the operations as the server takes them. */
export function buildPushBody(deviceId: string | null | undefined, operations: readonly OutboxOperation[]) {
  return {
    // The server takes a uuid only; an older install's id is left out.
    ...(isUuid(deviceId) ? { deviceId } : {}),
    operations: operations.map((operation) => ({
      opId: operation.opId,
      type: operation.type,
      occurredAt: operation.occurredAt,
      organizationId: operation.organizationId,
      data: operation.data,
    })),
  };
}

/* GET /api/sync/changes */

function parseClient(value: unknown): SyncedClient | null {
  const item = record(value);
  const id = positiveId(item.id);
  if (!id || !isUuid(item.uuid)) return null;
  return {
    id,
    uuid: item.uuid,
    fullName: text(item.fullName).trim(),
    phone: text(item.phoneNumber),
    note: text(item.note),
    currentBalance: finite(item.currentBalance),
    createdAt: nullableText(item.createdDate),
    version: finite(item.version) ?? 0,
  };
}

/** A "YYYY-MM-DD" day (or the day of a timestamp), else null. */
function dateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

function parseTransaction(value: unknown): SyncedTransaction | null {
  const item = record(value);
  const id = positiveId(item.id);
  const clientId = positiveId(item.clientId);
  const type = text(item.type).toLowerCase();
  const amount = finite(item.amount);
  if (!id || !clientId || !isUuid(item.uuid) || !isUuid(item.clientUuid)) return null;
  if ((type !== "debt" && type !== "payment") || amount === null) return null;
  return {
    id,
    uuid: item.uuid,
    clientId,
    clientUuid: item.clientUuid,
    type,
    amount,
    date: text(item.date),
    note: text(item.note),
    dueDate: dateOnly(item.dueDate),
    createdAt: nullableText(item.createdDate),
    version: finite(item.version) ?? 0,
  };
}

export function parseChangesResponse(input: unknown): ChangesPage {
  const value = unwrap(input);
  const deleted = record(value.deleted);
  const list = (raw: unknown) => (Array.isArray(raw) ? raw : []);
  return {
    organizationId: positiveId(value.organizationId),
    clients: list(value.clients).flatMap((item) => parseClient(item) ?? []),
    transactions: list(value.transactions).flatMap((item) => parseTransaction(item) ?? []),
    deletedClientUuids: list(deleted.clients).filter(isUuid),
    cursor: nullableText(value.cursor),
    hasMore: value.hasMore === true,
  };
}

/* Splitting the queue. */

/** The server takes at most this many operations a request. */
export const PUSH_BATCH_SIZE = 100;

export function chunkOperations<T>(items: readonly T[], size = PUSH_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

/** Waits between tries while the server is down: 15 s, 30 s, 1 min … at most 5 min. */
export function retryDelayMs(failures: number): number {
  return Math.min(15_000 * 2 ** Math.max(0, failures), 300_000);
}
