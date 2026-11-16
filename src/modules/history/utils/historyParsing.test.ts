import assert from "node:assert/strict";
import {
  nextPageParam,
  parseDeletedClientDetail,
  parseDeletedClients,
  parseOrganizationChanges,
  parsePurchases,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./historyParsing.ts";

/* Deleted customers: a page, as documented. */

const deleted = parseDeletedClients({
  count: 41,
  results: [
    {
      id: 5,
      fullName: "Ali",
      phoneNumber: "+998901234567",
      note: "",
      currentBalance: 250000,
      currencyCode: "UZS",
      createdDate: "2026-01-02T10:00:00",
      deletedDate: null,
      deletedByUserName: "Sardor",
      transactionsCount: "7",
    },
    { fullName: "no id" },
  ],
});
assert.equal(deleted.count, 41);
assert.equal(deleted.results.length, 1, "A row without an id is dropped");
assert.equal(deleted.results[0].deletedDate, null, "An old deletion has no date");
assert.equal(deleted.results[0].transactionsCount, 7);
assert.deepEqual(parseDeletedClients(null), { count: 0, results: [] });

/* One deleted customer with their history, newest first. */

const detail = parseDeletedClientDetail({
  client: { id: 5, fullName: "Ali", currentBalance: 100 },
  totalDebt: 300,
  totalPayment: 200,
  transactions: [
    { id: 1, type: "Debt", amount: 300, date: "2026-01-02T10:00:00", note: "", dueDate: "2026-02-01" },
    { id: 2, type: "payment", amount: 200, date: "2026-01-05T10:00:00", note: "", dueDate: "2026-02-01" },
    { id: 3, type: "refund", amount: 1, date: "2026-01-06" },
  ],
});
assert.ok(detail);
assert.deepEqual(detail.transactions.map((tx: { id: number }) => tx.id), [2, 1]);
assert.equal(detail.transactions[1].dueDate, "2026-02-01");
assert.equal(detail.transactions[0].dueDate, null, "A payment never carries a due date");
assert.equal(parseDeletedClientDetail({ transactions: [] }), null, "No client, nothing to show");

/* Purchases: gifts are marked, unknown kinds dropped. */

const purchases = parsePurchases({
  count: 2,
  results: [
    { kind: "subscription", name: "Premium", amount: 0, source: "gift", startAt: "2026-11-01", endAt: "2026-12-01" },
    { kind: "sms_package", name: "500 SMS", amount: 45000, provider: "payme", source: "purchase", smsCount: 500 },
    { kind: "coffee", name: "x" },
  ],
});
assert.equal(purchases.results.length, 2);
assert.equal(purchases.results[0].source, "gift");
assert.equal(purchases.results[1].smsCount, 500);

/* The shop's changes keep their type, even one this build does not know. */

const changes = parseOrganizationChanges({
  count: 2,
  results: [
    { id: 9, type: "client_deleted", clientId: 5, oldValue: "Ali", newValue: "100", userName: "Sardor", date: "2026-11-16T09:00:00" },
    { id: 10, type: "Something_New", oldValue: null, newValue: 3 },
  ],
});
assert.equal(changes.results[0].clientId, 5);
assert.equal(changes.results[1].type, "something_new");
assert.equal(changes.results[1].newValue, "3");

/* Paging stops at the count, or at an empty page. */

const page = (n: number) => ({ count: 45, results: Array.from({ length: n }, (_, i) => i) });
assert.equal(nextPageParam(page(20), [page(20)]), 2);
assert.equal(nextPageParam(page(5), [page(20), page(20), page(5)]), undefined);
assert.equal(nextPageParam(page(0), [page(20), page(0)]), undefined);

console.log("History parsing tests passed");
