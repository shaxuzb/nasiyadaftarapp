/**
 * A calendar day with no time and no zone, in the "YYYY-MM-DD" form the API
 * takes. Kept as a string so it compares and serializes without a timezone ever
 * shifting it onto a neighbouring day.
 */
export type DateOnly = string;

export interface CalendarMonth {
  year: number;
  /** 0 = January, matching Date#getMonth. */
  month: number;
}

export type CalendarCell = { day: number; date: DateOnly } | null;

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAYS_PER_WEEK = 7;
// Always six rows, so paging between months never changes the sheet's height.
const WEEKS_IN_GRID = 6;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateOnly(date: Date): DateOnly {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateOnly(now: Date = new Date()): DateOnly {
  return toDateOnly(now);
}

/** Local midnight for a date-only string, or null when it is not a real day. */
export function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  // Date rolls 2026-02-31 over into March instead of rejecting it.
  const isSameDay =
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day;
  return isSameDay ? date : null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function addDays(value: DateOnly, days: number): DateOnly {
  const date = parseDateOnly(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return toDateOnly(date);
}

/**
 * Moves by whole months and pins the day to the last day of a shorter month,
 * so 31 March minus one month is 28 or 29 February rather than 3 March.
 */
export function addMonths(value: DateOnly, months: number): DateOnly {
  const date = parseDateOnly(value);
  if (!date) return value;

  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const day = Math.min(
    date.getDate(),
    daysInMonth(target.getFullYear(), target.getMonth()),
  );
  return toDateOnly(new Date(target.getFullYear(), target.getMonth(), day));
}

export function monthOf(value: DateOnly): CalendarMonth {
  const date = parseDateOnly(value) ?? new Date();
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function shiftMonth(
  { year, month }: CalendarMonth,
  delta: number,
): CalendarMonth {
  const date = new Date(year, month + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() };
}

export function compareMonths(a: CalendarMonth, b: CalendarMonth): number {
  return a.year === b.year ? a.month - b.month : a.year - b.year;
}

/**
 * The days of a month laid out Monday-first, as calendars are in Uzbekistan
 * and Russia, padded with null so every row has seven cells.
 */
export function buildMonthGrid({ year, month }: CalendarMonth): CalendarCell[][] {
  // getDay() is Sunday-first; shift so Monday is column 0.
  const leading = (new Date(year, month, 1).getDay() + 6) % DAYS_PER_WEEK;
  const total = daysInMonth(year, month);

  const cells: CalendarCell[] = Array.from(
    { length: WEEKS_IN_GRID * DAYS_PER_WEEK },
    (_, index) => {
      const day = index - leading + 1;
      if (day < 1 || day > total) return null;
      return { day, date: `${year}-${pad(month + 1)}-${pad(day)}` };
    },
  );

  return Array.from({ length: WEEKS_IN_GRID }, (_, week) =>
    cells.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
  );
}
