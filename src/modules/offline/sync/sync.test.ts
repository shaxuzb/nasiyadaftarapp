import assert from "node:assert/strict";
import {
  buildPushBody,
  chunkOperations,
  isUuid,
  parseChangesResponse,
  parsePushResponse,
  planPushResults,
  retryDelayMs,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./syncParsing.ts";
import {
  applyPendingToCustomer,
  applyPendingToCustomers,
  applyPendingToHistory,
  applyPendingToReport,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./pendingOverlay.ts";
import type { OutboxOperation } from "./syncTypes";

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const clientOp: OutboxOperation = {
  seq: 1, opId: U(901), userId: 7, organizationId: 3, type: "client.create",
  data: { uuid: U(1), fullName: "Ali", phoneNumber: "+998939987055", note: "", initialBalance: 50000 },
  meta: { tempId: -1001 }, occurredAt: "2026-11-04T10:15:00+05:00", status: "pending", errorCode: null, errorMessage: null,
};
const debtForNew: OutboxOperation = {
  seq: 2, opId: U(902), userId: 7, organizationId: 3, type: "transaction.create",
  data: { uuid: U(2), clientUuid: U(1), type: "debt", amount: 250000, date: "2026-11-04", note: "Un" },
  meta: { clientTempId: -1001, clientName: "Ali" }, occurredAt: "2026-11-04T10:16:00+05:00", status: "pending", errorCode: null, errorMessage: null,
};
const paymentForKnown: OutboxOperation = {
  seq: 3, opId: U(903), userId: 7, organizationId: 3, type: "transaction.create",
  data: { uuid: U(3), clientId: 40, type: "payment", amount: 30000, date: "2026-11-04", note: "" },
  meta: { clientName: "Vali" }, occurredAt: "2026-11-04T10:17:00+05:00", status: "pending", errorCode: null, errorMessage: null,
};
const refused: OutboxOperation = { ...paymentForKnown, seq: 4, opId: U(904), data: { ...(paymentForKnown.data as object), uuid: U(4), amount: 999 } as OutboxOperation["data"], status: "rejected" };
const queue = [clientOp, debtForNew, paymentForKnown, refused];

/* What the screens show before the server has it. */

const known = [{ id: 40, uuid: U(40), fullName: "Vali", phone: "", currentBalance: 100000 }];
const list = applyPendingToCustomers(known, queue);
assert.equal(list.length, 2, "The customer added offline is in the list");
assert.deepEqual(
  list.map((customer: { id: number; currentBalance?: number; pendingSync?: boolean }) => [customer.id, customer.currentBalance, customer.pendingSync]),
  [[-1001, 300000, true], [40, 70000, true]],
  "Its starting balance and its debt; the known customer's payment; the refused one changes nothing",
);
assert.equal(applyPendingToCustomers(known, []), known, "Nothing waiting: the very same list");
assert.equal(
  applyPendingToCustomers([{ id: 55, uuid: U(1), fullName: "Ali", phone: "", currentBalance: 50000 }], [clientOp]).length,
  1,
  "Already on the server's list: shown once",
);
assert.equal(applyPendingToCustomer(known[0], queue).currentBalance, 70000);

/* The report: the remaining balance and the top debtors move with the queue. */
const report = {
  remainingBalance: 1_000_000,
  topDebtors: [
    { clientId: 40, fullName: "Vali", phoneNumber: "", balance: 100000 },
    { clientId: 41, fullName: "Sora", phoneNumber: "", balance: 80000 },
  ],
};
const ranked = applyPendingToReport(report, queue, list, 2);
assert.equal(ranked.remainingBalance, 1_000_000 + 50000 + 250000 - 30000, "Opening balance, debt and payment; never the refused one");
assert.deepEqual(
  ranked.topDebtors.map((debtor: { clientId: number; balance: number }) => [debtor.clientId, debtor.balance]),
  [[-1001, 300000], [41, 80000]],
  "Ranked again with the phone's balances, cut to the limit",
);
assert.equal(applyPendingToReport(report, [], list, 2), report, "Nothing waiting: the very same report");
assert.deepEqual(
  applyPendingToReport(report, [paymentForKnown], [], 10).topDebtors.map((debtor: { clientId: number; balance: number }) => [debtor.clientId, debtor.balance]),
  [[41, 80000], [40, 70000]],
  "Without the list, a debtor is moved by its own writes",
);

const history = applyPendingToHistory([{ id: 9, customerId: 40, type: "debt", amount: 100000, date: "2026-11-01", uuid: U(9) }], queue, known[0]);
assert.deepEqual(history.map((item: { id: number; pendingSync?: boolean }) => [item.id, item.pendingSync]), [[-3, true], [9, undefined]]);
assert.deepEqual(
  applyPendingToHistory([], queue, { id: -1001, uuid: U(1) }).map((item: { amount: number }) => item.amount),
  [250000],
  "A customer added offline: its own debt, found by its stand-in id",
);

/* The push. */

assert.equal(isUuid(U(1)), true);
assert.equal(isUuid("legacy-device"), false);
assert.deepEqual(buildPushBody("legacy-device", [clientOp]), {
  operations: [{ opId: U(901), type: "client.create", occurredAt: clientOp.occurredAt, organizationId: 3, data: clientOp.data }],
}, "An older install's id is left out; each operation names its organization");
assert.equal(buildPushBody(U(77), []).deviceId, U(77));
assert.deepEqual(chunkOperations([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);

const results = parsePushResponse({
  results: [
    { opId: U(901), status: "merged", client: { id: 4812, uuid: U(55), currentBalance: 50000 } },
    { opId: U(902), status: "applied", client: { id: 4812, uuid: U(55), currentBalance: 300000 }, transaction: { id: 99121, uuid: U(2) } },
    { opId: U(903), status: "rejected", code: "CLIENT_DELETED", message: "Mijoz o'chirilgan" },
    { opId: U(905), status: "weird" },
    "nonsense",
  ],
});
assert.equal(results.length, 3, "An unreadable result is left out");
const plan = planPushResults([clientOp, debtForNew, paymentForKnown, { ...paymentForKnown, opId: U(906) }], results);
assert.deepEqual(plan.done, [U(901), U(902)], "Applied, duplicate and merged leave the queue");
assert.deepEqual(plan.rejected, [{ opId: U(903), code: "CLIENT_DELETED", message: "Mijoz o'chirilgan" }]);
assert.deepEqual(plan.clients[0], { localUuid: U(1), tempId: -1001, id: 4812, uuid: U(55), currentBalance: 50000 }, "Merged: into the server's customer");
assert.equal(plan.clients[1].tempId, -1001, "A debt for the customer added offline maps it too");
assert.equal(plan.done.includes(U(906)), false, "No answer: stays queued");

/* The changes. */

const page = parseChangesResponse({
  organizationId: 3,
  clients: [
    { id: 4812, uuid: U(55), fullName: " Ali ", phoneNumber: "+998939987055", note: null, currentBalance: "300000", createdDate: "2026-11-04T05:15:00Z", version: 18900 },
    { id: 0, uuid: U(56) },
  ],
  transactions: [
    { id: 99121, uuid: U(2), clientId: 4812, clientUuid: U(55), type: "Debt", amount: 250000, date: "2026-11-04", note: "Un", version: 18901 },
    { id: 99122, uuid: U(3), clientId: 4812, clientUuid: U(55), type: "refund", amount: 1 },
  ],
  deleted: { clients: [U(77), "nope"], transactions: [] },
  cursor: "3:18907",
  hasMore: true,
});
assert.equal(page.clients.length, 1);
assert.deepEqual([page.clients[0].fullName, page.clients[0].currentBalance, page.clients[0].note], ["Ali", 300000, ""]);
assert.deepEqual(page.transactions.map((item: { type: string }) => item.type), ["debt"], "Only debts and payments");
assert.deepEqual(page.deletedClientUuids, [U(77)]);
assert.deepEqual([page.cursor, page.hasMore], ["3:18907", true]);
assert.deepEqual(parseChangesResponse(null), { organizationId: null, clients: [], transactions: [], deletedClientUuids: [], cursor: null, hasMore: false });

/* Retrying. */

assert.deepEqual([0, 1, 2, 10].map(retryDelayMs), [15_000, 30_000, 60_000, 300_000]);

console.log("Offline sync tests passed");
