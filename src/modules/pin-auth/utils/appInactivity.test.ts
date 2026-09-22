// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { shouldLockAfterInactivity } from "./appInactivity.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

assert(!shouldLockAfterInactivity(null, 120_000), "Fresh active session must not lock");
assert(!shouldLockAfterInactivity(0, 119_999), "Session must stay open before timeout");
assert(shouldLockAfterInactivity(0, 120_000), "Session must lock at two minutes");
assert(shouldLockAfterInactivity(0, 180_000), "Session must lock after two minutes");

assert(
  shouldLockAfterInactivity(120_000, 0),
  "Clock moved backwards must lock instead of skipping the timeout",
);
assert(
  shouldLockAfterInactivity(1, 0),
  "Any backwards clock drift must lock",
);

console.log("app inactivity regression tests passed");
