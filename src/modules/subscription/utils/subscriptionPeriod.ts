/** How many calendar days before the end the app starts reminding. */
export const RENEWAL_REMINDER_DAYS = 3;

const DAY_MS = 86_400_000;

export interface SubscriptionPeriod {
  startAt: Date | null;
  /** Null for a plan with no end, such as the free one. */
  endAt: Date | null;
  /**
   * Calendar days from today to the last day: 0 on that day, 1 the day
   * before. Null when there is no end.
   */
  daysLeft: number | null;
  /** The end has passed. */
  ended: boolean;
  /** Within the reminder window and not over yet. */
  endingSoon: boolean;
}

interface PeriodSource {
  startAt?: string | null;
  endAt?: string | null;
}

function readDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfLocalDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Where a subscription stands in time. Days are counted on the calendar, not
 * in 24-hour blocks, so "today" and "tomorrow" mean what the user expects
 * whatever the hour.
 */
export function getSubscriptionPeriod(
  subscription: PeriodSource | null | undefined,
  now = Date.now(),
): SubscriptionPeriod {
  const startAt = readDate(subscription?.startAt);
  const endAt = readDate(subscription?.endAt);
  if (!endAt) {
    return { startAt, endAt: null, daysLeft: null, ended: false, endingSoon: false };
  }

  const ended = endAt.getTime() <= now;
  const daysLeft = ended
    ? 0
    : Math.max(
        0,
        Math.round((startOfLocalDay(endAt.getTime()) - startOfLocalDay(now)) / DAY_MS),
      );
  return {
    startAt,
    endAt,
    daysLeft,
    ended,
    endingSoon: !ended && daysLeft <= RENEWAL_REMINDER_DAYS,
  };
}

/** "2026-10-20" for the user's own today: one reminder dismissal lasts a day. */
export function toLocalDayKey(now = Date.now()): string {
  const date = new Date(now);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** What is remembered when the user closes the reminder. */
export interface RenewalReminderDismissal {
  userId: number;
  /** The end the reminder was about: renewing gives a new end, and a new reminder. */
  endAt: string;
  day: string;
}

export function parseRenewalReminderDismissal(
  raw: string | null,
): RenewalReminderDismissal | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RenewalReminderDismissal>;
    return typeof value.userId === "number" &&
      typeof value.endAt === "string" &&
      typeof value.day === "string"
      ? { userId: value.userId, endAt: value.endAt, day: value.day }
      : null;
  } catch {
    return null;
  }
}

/** Closed today, by this user, about this same end date. */
export function isRenewalReminderDismissed(
  dismissal: RenewalReminderDismissal | null,
  current: RenewalReminderDismissal,
): boolean {
  return (
    dismissal !== null &&
    dismissal.userId === current.userId &&
    dismissal.endAt === current.endAt &&
    dismissal.day === current.day
  );
}
