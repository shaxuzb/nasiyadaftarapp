import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { isMonthlyPlan } from "./planPeriod.ts";

/* A month, however the server counts it. */

for (const days of [28, 29, 30, 31]) {
  assert.equal(isMonthlyPlan(days), true, `${days} days is a month`);
}

/* Anything else gets no "per month" label rather than a wrong one. */

for (const days of [0, 1, 7, 27, 32, 90, 365, -30, Number.NaN, null, undefined]) {
  assert.equal(isMonthlyPlan(days), false, `${String(days)} is not a month`);
}

console.log("Plan period tests passed");
