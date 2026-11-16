import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { daysBetween, findNextDue, unpaidDebts } from "./dueDate.ts";

const debt = (id: number, amount: number, date: string, dueDate?: string) => ({
  id,
  type: "debt" as const,
  amount,
  date,
  dueDate,
});
const payment = (id: number, amount: number, date: string) => ({
  id,
  type: "payment" as const,
  amount,
  date,
});

/* A payment pays the oldest debt first. */

const history = [
  debt(1, 100, "2026-11-01T10:00:00", "2026-11-10"),
  debt(2, 300, "2026-11-05T10:00:00", "2026-11-25"),
  payment(3, 150, "2026-11-06T10:00:00"),
];
assert.deepEqual([...unpaidDebts(history)], [[2, 250]], "The first debt is paid off, 250 of the second left");
assert.deepEqual(findNextDue(history, "2026-11-16"), { dueDate: "2026-11-25", amount: 250, days: 9 });

/* A passed date still owed counts down below zero. */

const late = [debt(1, 100, "2026-11-01", "2026-11-10"), payment(2, 40, "2026-11-02")];
assert.deepEqual(findNextDue(late, "2026-11-16"), { dueDate: "2026-11-10", amount: 60, days: -6 });

/* Everything paid, or no date set: nothing to show. */

assert.equal(findNextDue([debt(1, 100, "2026-11-01", "2026-11-10"), payment(2, 100, "2026-11-03")], "2026-11-16"), null);
assert.equal(findNextDue([debt(1, 100, "2026-11-01")], "2026-11-16"), null);

/* Two debts due the same day add up. */

assert.equal(
  findNextDue([debt(1, 100, "2026-11-01", "2026-11-20"), debt(2, 50, "2026-11-02", "2026-11-20")], "2026-11-16")?.amount,
  150,
);

assert.equal(daysBetween("2026-11-16", "2026-11-16"), 0);
assert.equal(daysBetween("2026-11-16", "2026-11-17"), 1);
assert.equal(daysBetween("2026-12-31", "2027-01-01"), 1);
assert.equal(daysBetween("2026-03-28", "2026-03-30"), 2, "No daylight-saving drift");

console.log("Debt return date tests passed");
