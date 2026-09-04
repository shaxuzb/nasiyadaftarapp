// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { recordFailedPinAttempt } from "./appLockState.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

assert(
  recordFailedPinAttempt(4).mustLogout,
  "Fifth consecutive incorrect PIN must request logout",
);
assert(
  !recordFailedPinAttempt(3).mustLogout,
  "Fourth incorrect PIN must leave one final attempt",
);

console.log("app lock state regression tests passed");
