import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { parseDueClients, readDay, sortDueClients } from "./dueClients.ts";

/* GET /api/clients/due, as documented: a bare array. */

const parsed = parseDueClients([
  {
    clientId: 12,
    clientUuid: "3f0c1a52-0000-4000-8000-000000000012",
    fullName: " Ali Valiyev ",
    phoneNumber: "+998901234567",
    currentBalance: 500000,
    dueAmount: 300000,
    dueDate: "2026-11-16",
    currencyCode: "UZS",
  },
  { clientId: "7", fullName: "Vali", currentBalance: "200000", dueAmount: 200000, dueDate: "2026-11-14T00:00:00" },
  { clientId: 12, fullName: "duplicate" },
  { fullName: "no id" },
  null,
]);
assert.equal(parsed.length, 2, "Rows without an id, and repeats, are dropped");
assert.deepEqual(parsed[0], {
  clientId: 12,
  clientUuid: "3f0c1a52-0000-4000-8000-000000000012",
  fullName: "Ali Valiyev",
  phoneNumber: "+998901234567",
  currentBalance: 500000,
  dueAmount: 300000,
  dueDate: "2026-11-16",
  currencyCode: "UZS",
});
assert.equal(parsed[1].clientId, 7, "A numeric string id is read");
assert.equal(parsed[1].currentBalance, 200000);
assert.equal(parsed[1].dueDate, "2026-11-14", "A timestamp is read as its day");

/* Wrapped answers read the same. */

assert.equal(parseDueClients({ results: [{ clientId: 1, currentBalance: 1 }] }).length, 1);
assert.equal(parseDueClients({ data: [{ clientId: 1, currentBalance: 1 }] }).length, 1);
assert.deepEqual(parseDueClients("nonsense"), []);

/* Only those still owing; the oldest due day first, then the larger debt. */

const sorted = sortDueClients([
  { ...parsed[0], clientId: 1, dueAmount: 100, currentBalance: 100, dueDate: "2026-11-16" },
  { ...parsed[0], clientId: 2, dueAmount: 900, currentBalance: 900, dueDate: "2026-11-16" },
  { ...parsed[0], clientId: 3, dueAmount: 50, currentBalance: 50, dueDate: "2026-11-10" },
  { ...parsed[0], clientId: 4, dueAmount: 500, currentBalance: 0, dueDate: "2026-11-16" },
]);
assert.deepEqual(sorted.map((client: { clientId: number }) => client.clientId), [3, 2, 1]);

assert.equal(readDay("2026-12-01"), "2026-12-01");
assert.equal(readDay("01.12.2026"), null);
assert.equal(readDay(undefined), null);

console.log("Due clients parsing tests passed");
