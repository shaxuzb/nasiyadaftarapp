/**
 * Writing while the server cannot be reached (offline, phase 2): what is
 * queued on the phone and what the server answers. The API is the backend's
 * offline-sync.md: POST /api/sync/push and GET /api/sync/changes.
 *
 * Only two things can be written offline: adding a customer and recording a
 * debt or payment (also for a customer added offline). Everything else needs
 * the server.
 */

export type OutboxOperationType = "client.create" | "transaction.create";

export interface ClientCreateData {
  uuid: string;
  fullName: string;
  phoneNumber: string;
  note: string;
  initialBalance?: number;
  initialBalanceDate?: string | null;
}

export interface TransactionCreateData {
  uuid: string;
  /** The customer, by uuid when the phone knows it (always, for one added offline). */
  clientUuid?: string;
  /** The customer, by the server's id when its uuid is not known. */
  clientId?: number;
  type: "debt" | "payment";
  amount: number;
  date?: string;
  note: string;
}

/** What the phone keeps beside an operation, for showing it; never sent. */
export interface OutboxMeta {
  /** A customer added offline: the stand-in id the screens use until it has a real one (negative). */
  tempId?: number;
  /** A debt or payment: who it is for, as shown when it was written. */
  clientName?: string;
  /** A debt or payment for a customer added offline: that customer's stand-in id. */
  clientTempId?: number;
}

export type OutboxStatus = "pending" | "rejected";

export interface OutboxOperation {
  /** Order of writing: operations are sent in this order. */
  seq: number;
  opId: string;
  userId: number;
  organizationId: number;
  type: OutboxOperationType;
  data: ClientCreateData | TransactionCreateData;
  meta: OutboxMeta;
  /** When it was written on the phone, ISO with the phone's offset. */
  occurredAt: string;
  status: OutboxStatus;
  errorCode: string | null;
  errorMessage: string | null;
}

export type PushStatus = "applied" | "duplicate" | "merged" | "rejected";

export interface PushResult {
  opId: string;
  status: PushStatus;
  code: string | null;
  message: string | null;
  client: { id: number; uuid: string; currentBalance: number | null } | null;
  transaction: { id: number; uuid: string } | null;
}

export interface SyncedClient {
  id: number;
  uuid: string;
  fullName: string;
  phone: string;
  note: string;
  currentBalance: number | null;
  createdAt: string | null;
  version: number;
}

export interface SyncedTransaction {
  id: number;
  uuid: string;
  clientId: number;
  clientUuid: string;
  type: "debt" | "payment";
  amount: number;
  date: string;
  note: string;
  createdAt: string | null;
  version: number;
}

export interface ChangesPage {
  organizationId: number | null;
  clients: SyncedClient[];
  transactions: SyncedTransaction[];
  deletedClientUuids: string[];
  cursor: string | null;
  hasMore: boolean;
}
