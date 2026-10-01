// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { MAX_LOCKOUT_MS, MAX_PIN_ATTEMPTS, getAttemptsRemaining, getLockoutDurationMs, getLockoutSeconds, getRemainingLockoutMs, isLockoutActive, parseLockedUntil, formatLockoutCountdown } from "./pinLockout.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

// Attempts below the limit never lock.
assert(getLockoutDurationMs(0) === null, "A fresh session must not be locked");
assert(getLockoutDurationMs(4) === null, "The fourth failure must not lock");
assert(getAttemptsRemaining(0) === 5, "A fresh session has five attempts");
assert(getAttemptsRemaining(4) === 1, "One attempt remains after four failures");

// The ladder escalates and then holds at its longest rung.
assert(getLockoutDurationMs(5) === 30_000, "The fifth failure locks for 30s");
assert(getLockoutDurationMs(6) === 60_000, "The sixth failure locks for a minute");
assert(getLockoutDurationMs(7) === 300_000, "The seventh failure locks for 5 minutes");
assert(getLockoutDurationMs(8) === 900_000, "The eighth failure locks for 15 minutes");
assert(
  getLockoutDurationMs(40) === MAX_LOCKOUT_MS,
  "Further failures must hold at the longest rung, not grow without bound",
);
assert(
  getAttemptsRemaining(MAX_PIN_ATTEMPTS + 3) === 0,
  "Attempts remaining must floor at zero once locked",
);

// Countdown arithmetic.
assert(getRemainingLockoutMs(null, 1_000) === 0, "No deadline means no lock");
assert(getRemainingLockoutMs(5_000, 5_000) === 0, "The deadline itself is open");
assert(getRemainingLockoutMs(5_000, 6_000) === 0, "A passed deadline is open");
assert(getRemainingLockoutMs(30_000, 0) === 30_000, "A full lock reports its length");
assert(isLockoutActive(30_000, 29_999), "One millisecond short is still locked");
assert(!isLockoutActive(30_000, 30_000), "Reaching the deadline unlocks");

// A device clock moved backwards must not strand the user past the longest rung.
assert(
  getRemainingLockoutMs(MAX_LOCKOUT_MS * 10, 0) === MAX_LOCKOUT_MS,
  "A rewound clock must clamp to the longest rung",
);

// Countdown display rounds up so the last fraction of a second still shows.
assert(getLockoutSeconds(null, 0) === 0, "An open gate shows no countdown");
assert(getLockoutSeconds(30_000, 0) === 30, "A fresh 30s lock shows 30");
assert(getLockoutSeconds(30_000, 29_500) === 1, "The final half second shows 1");
assert(getLockoutSeconds(30_000, 30_000) === 0, "An expired lock shows nothing");

// Malformed stored values must not lock anyone out.
assert(getRemainingLockoutMs(Number.NaN, 0) === 0, "NaN deadline must not lock");
assert(getLockoutDurationMs(Number.NaN) === null, "NaN attempts must not lock");
assert(getAttemptsRemaining(Number.NaN) === 5, "NaN attempts fall back to a full allowance");
assert(getAttemptsRemaining(-3) === 5, "A negative count falls back to a full allowance");

// Countdown formatting.
assert(formatLockoutCountdown(30) === "0:30", "Half a minute reads as 0:30");
assert(formatLockoutCountdown(60) === "1:00", "A minute reads as 1:00");
assert(formatLockoutCountdown(905) === "15:05", "Quarter of an hour reads as 15:05");
assert(formatLockoutCountdown(0) === "0:00", "Zero reads as 0:00");
assert(formatLockoutCountdown(-5) === "0:00", "A negative count never renders as negative");

// Stored deadlines.
assert(parseLockedUntil(null) === null, "No stored deadline means no lock");
assert(parseLockedUntil("") === null, "A blank deadline means no lock");
assert(parseLockedUntil("not-a-date") === null, "An unparseable deadline must not lock");
assert(
  parseLockedUntil("2026-09-23T10:00:00.000Z") === Date.parse("2026-09-23T10:00:00.000Z"),
  "A valid ISO deadline parses to its timestamp",
);

console.log("PIN lockout escalation regression tests passed");
