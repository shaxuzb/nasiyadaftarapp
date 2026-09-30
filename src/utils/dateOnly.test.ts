// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { addDays, addMonths, buildMonthGrid, compareMonths, monthOf, parseDateOnly, shiftMonth, toDateOnly, todayDateOnly } from "./dateOnly.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

// Formatting uses the local calendar day, never UTC.
assert(toDateOnly(new Date(2026, 2, 5)) === "2026-03-05", "Pads month and day");
assert(todayDateOnly(new Date(2026, 11, 31, 23, 59)) === "2026-12-31", "Late evening stays on the same day");

// Parsing rejects anything that is not a real calendar day.
assert(parseDateOnly("2026-02-29") === null, "2026 is not a leap year");
assert(parseDateOnly("2028-02-29") !== null, "2028 is a leap year");
assert(parseDateOnly("2026-13-01") === null, "Month 13 is rejected");
assert(parseDateOnly("2026-04-31") === null, "April has 30 days");
assert(parseDateOnly("12.03.2026") === null, "Other formats are rejected");
assert(parseDateOnly("") === null, "Blank is rejected");

// Day arithmetic crosses month and year boundaries.
assert(addDays("2026-03-01", -1) === "2026-02-28", "Steps back into February");
assert(addDays("2026-01-01", -1) === "2025-12-31", "Steps back into the previous year");
assert(addDays("2026-03-05", -7) === "2026-02-26", "One week back");

// Month arithmetic pins to the end of a shorter month instead of overflowing.
assert(addMonths("2026-03-31", -1) === "2026-02-28", "31 March minus a month is 28 February");
assert(addMonths("2028-03-31", -1) === "2028-02-29", "Leap years keep 29 February");
assert(addMonths("2026-01-15", -1) === "2025-12-15", "Crosses the year");
assert(addMonths("2026-05-31", -1) === "2026-04-30", "April has 30 days");

// Month paging.
assert(JSON.stringify(monthOf("2026-03-05")) === JSON.stringify({ year: 2026, month: 2 }), "Reads the month");
assert(JSON.stringify(shiftMonth({ year: 2026, month: 0 }, -1)) === JSON.stringify({ year: 2025, month: 11 }), "January back is December");
assert(JSON.stringify(shiftMonth({ year: 2026, month: 11 }, 1)) === JSON.stringify({ year: 2027, month: 0 }), "December forward is January");
assert(compareMonths({ year: 2026, month: 2 }, { year: 2026, month: 3 }) < 0, "Earlier month sorts first");
assert(compareMonths({ year: 2025, month: 11 }, { year: 2026, month: 0 }) < 0, "Earlier year sorts first");
assert(compareMonths({ year: 2026, month: 2 }, { year: 2026, month: 2 }) === 0, "Same month is equal");

// The grid is Monday-first and always six full weeks.
const march2026 = buildMonthGrid({ year: 2026, month: 2 });
assert(march2026.length === 6, "Always six weeks, so the sheet height never jumps");
assert(march2026.every((week) => week.length === 7), "Every week has seven cells");
// 1 March 2026 is a Sunday, so it lands in the last column of the first row.
assert(march2026[0][6]?.day === 1, "Sunday 1 March sits in the Sunday column");
assert(march2026[0].slice(0, 6).every((cell) => cell === null), "Days before the 1st are empty");
assert(march2026[0][6]?.date === "2026-03-01", "Cells carry their date");
const days = march2026.flat().filter((cell) => cell !== null);
assert(days.length === 31, "March has 31 days");
assert(days[30]?.date === "2026-03-31", "The grid ends on the 31st");

// A month starting on Monday has no leading padding.
const june2026 = buildMonthGrid({ year: 2026, month: 5 });
assert(june2026[0][0]?.day === 1, "Monday 1 June starts the first row");

console.log("Date-only calendar helpers tests passed");
