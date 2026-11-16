import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { reportFromSavedCustomers } from "./phoneReport.ts";

const report = reportFromSavedCustomers([
  { currentBalance: 250000 },
  { currentBalance: -50000 },
  { currentBalance: 0.1 },
  { currentBalance: 0.2 },
  { currentBalance: undefined },
]);
assert.equal(report.remainingBalance, 200000.3, "Owed minus paid ahead, to the cent");
assert.equal(report.activeDebtorsCount, 3);
assert.equal(report.totalClients, 5);
assert.deepEqual(report.topDebtors, [], "Only the total: the rest is the server's");
assert.equal(report.computedOnPhone, true);
assert.equal(reportFromSavedCustomers([]).remainingBalance, 0);

console.log("Phone report tests passed");
