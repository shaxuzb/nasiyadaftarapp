import assert from "node:assert/strict";
// @ts-expect-error Standalone Node test imports the TypeScript module directly.
import { formatLocalizedDate, formatLocalizedDateTime } from "./formatters.ts";

const day = formatLocalizedDate(new Date(2026, 9, 21), "uz");

/* The server's time, as it wrote it: nothing worked out, nothing added. */

assert.equal(formatLocalizedDateTime("2026-10-21T15:07:00", "uz"), `${day}, 15:07`);
assert.equal(formatLocalizedDateTime("2026-10-21T15:07:59.123", "uz"), `${day}, 15:07`, "Seconds are left out");
assert.equal(formatLocalizedDateTime("2026-10-21 15:07", "uz"), `${day}, 15:07`);
assert.equal(
  formatLocalizedDateTime("2026-10-21T09:00:00Z", "uz"),
  `${day}, 09:00`,
  "A zone after the time does not move it",
);
assert.equal(formatLocalizedDateTime("2026-10-21T23:30:00+05:00", "uz"), `${day}, 23:30`, "Nor does an offset, nor the day");

/* No time: the date alone, never 00:00. */

assert.equal(formatLocalizedDateTime("2026-10-21", "uz"), day);
assert.equal(formatLocalizedDateTime("  2026-10-21  ", "uz"), day);

/* The phone's own moment shows the phone's clock. */

assert.equal(formatLocalizedDateTime(new Date(2026, 9, 21, 8, 5), "uz"), `${day}, 08:05`);

/* Russian keeps its own date, then the time the same way. */

assert.equal(
  formatLocalizedDateTime("2026-10-21T15:07:00", "ru"),
  `${formatLocalizedDate(new Date(2026, 9, 21), "ru")}, 15:07`,
);

console.log("Date and time formatting tests passed");
