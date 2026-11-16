import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The on-device copy of what the server last sent, kept in the app's own
 * files (not its cache), so the app still opens with its data when the server
 * is down. Every row belongs to one user in one organization (`scope`, as in
 * the query keys), so organizations never mix.
 *
 * `data` is the record exactly as the app uses it (JSON); the other columns
 * are what the device itself needs to find it.
 */

export const clients = sqliteTable(
  "clients",
  {
    scope: text("scope").notNull(),
    id: integer("id").notNull(),
    /** The id the phone and the server share; how changes and deletions find it. */
    uuid: text("uuid"),
    /** Name and phone, lower-cased, for searching on the device. */
    searchText: text("search_text").notNull(),
    /** Where it stood in the server's list, so the list keeps its order. */
    position: integer("position").notNull(),
    data: text("data").notNull(),
    savedAt: integer("saved_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.id] }),
    index("clients_scope").on(table.scope),
    index("clients_uuid").on(table.scope, table.uuid),
  ],
);

/**
 * Every debt and payment the phone knows, from a customer's history and from
 * the server's changes alike, found by the uuid both share.
 */
export const transactions = sqliteTable(
  "transactions",
  {
    scope: text("scope").notNull(),
    uuid: text("uuid").notNull(),
    clientId: integer("client_id").notNull(),
    clientUuid: text("client_uuid"),
    /** Newest first: the day, then when it was entered, then the id. */
    sortKey: text("sort_key").notNull(),
    data: text("data").notNull(),
    savedAt: integer("saved_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.scope, table.uuid] }),
    index("transactions_client").on(table.scope, table.clientId),
    index("transactions_client_uuid").on(table.scope, table.clientUuid),
  ],
);

/**
 * Writes made while the server could not be reached, in the order made, until
 * the server has them. Kept per user across signing out: they are sent once
 * the same user is back, never under anyone else.
 */
export const outbox = sqliteTable(
  "outbox",
  {
    seq: integer("seq").primaryKey({ autoIncrement: true }),
    opId: text("op_id").notNull().unique(),
    userId: integer("user_id").notNull(),
    organizationId: integer("organization_id").notNull(),
    type: text("type").notNull(),
    data: text("data").notNull(),
    meta: text("meta").notNull(),
    occurredAt: text("occurred_at").notNull(),
    /** pending, or rejected (refused by the server, kept for the user to see). */
    status: text("status").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("outbox_user").on(table.userId, table.status)],
);

/**
 * A customer added offline is shown under a stand-in (negative) id; once the
 * server has it, this says which real customer that is, so a screen still
 * open on the stand-in finds it.
 */
export const clientAliases = sqliteTable(
  "client_aliases",
  {
    scope: text("scope").notNull(),
    tempId: integer("temp_id").notNull(),
    serverId: integer("server_id").notNull(),
    serverUuid: text("server_uuid").notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.tempId] })],
);

/** A whole answer kept as it came (a report), or a "saved at" mark. */
export const snapshots = sqliteTable(
  "snapshots",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    data: text("data").notNull(),
    savedAt: integer("saved_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.scope, table.key] })],
);
