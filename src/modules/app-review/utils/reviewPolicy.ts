/**
 * When to ask for a store rating.
 *
 * Both stores show their own dialog and decide for themselves whether it really
 * appears (iOS at most three times a year, Google Play on a quota it does not
 * publish), and neither tells the app what the user did. So the only thing the
 * app controls is picking a good moment and not wasting the attempts.
 */

export interface ReviewPromptState {
  /** Transactions saved successfully on this device. */
  successCount: number;
  /** When the first of them was saved, epoch ms. */
  firstSuccessAt: number | null;
  /** When the store dialog was last requested, epoch ms. */
  lastRequestedAt: number | null;
  /** `successCount` at that moment. */
  successCountAtLastRequest: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The user has to have got real use out of the app first. */
export const MIN_SUCCESSES_BEFORE_FIRST_REQUEST = 5;
/**
 * ...and over several days, not five entries in the first hour. iOS shows the
 * dialog at most three times a year, so an attempt is worth more on someone
 * who came back than on someone still trying the app out.
 */
export const MIN_DAYS_BEFORE_FIRST_REQUEST = 3;
/**
 * Never ask again sooner than this. Sized for iOS, which shows the dialog at
 * most three times in a year.
 */
export const DAYS_BETWEEN_REQUESTS = 120;
/**
 * Google Play has no yearly cap, only an unpublished quota, so Android can ask
 * again sooner. Still well over a month apart, to stay inside that quota.
 */
export const ANDROID_DAYS_BETWEEN_REQUESTS = 45;
/** ...and only if the app has kept being used since. */
export const MIN_SUCCESSES_BETWEEN_REQUESTS = 10;

export const INITIAL_REVIEW_PROMPT_STATE: ReviewPromptState = {
  successCount: 0,
  firstSuccessAt: null,
  lastRequestedAt: null,
  successCountAtLastRequest: 0,
};

/** Reads stored state defensively: a damaged value starts over instead of throwing. */
export function parseReviewPromptState(raw: string | null): ReviewPromptState {
  if (!raw) return INITIAL_REVIEW_PROMPT_STATE;
  try {
    const value = JSON.parse(raw) as Partial<Record<keyof ReviewPromptState, unknown>>;
    const count = (input: unknown) =>
      typeof input === "number" && Number.isFinite(input) && input > 0
        ? Math.trunc(input)
        : 0;
    const time = (input: unknown) =>
      typeof input === "number" && Number.isFinite(input) && input > 0
        ? input
        : null;
    return {
      successCount: count(value.successCount),
      firstSuccessAt: time(value.firstSuccessAt),
      lastRequestedAt: time(value.lastRequestedAt),
      successCountAtLastRequest: count(value.successCountAtLastRequest),
    };
  } catch {
    return INITIAL_REVIEW_PROMPT_STATE;
  }
}

export function recordReviewSuccess(
  state: ReviewPromptState,
  now: number,
): ReviewPromptState {
  return {
    ...state,
    successCount: state.successCount + 1,
    firstSuccessAt: state.firstSuccessAt ?? now,
  };
}

export function markReviewRequested(
  state: ReviewPromptState,
  now: number,
): ReviewPromptState {
  return {
    ...state,
    lastRequestedAt: now,
    successCountAtLastRequest: state.successCount,
  };
}

export function shouldRequestReview(
  state: ReviewPromptState,
  now: number,
  daysBetweenRequests: number = DAYS_BETWEEN_REQUESTS,
): boolean {
  if (state.firstSuccessAt === null) return false;

  if (state.lastRequestedAt === null) {
    return (
      state.successCount >= MIN_SUCCESSES_BEFORE_FIRST_REQUEST &&
      now - state.firstSuccessAt >= MIN_DAYS_BEFORE_FIRST_REQUEST * DAY_MS
    );
  }

  return (
    now - state.lastRequestedAt >= daysBetweenRequests * DAY_MS &&
    state.successCount - state.successCountAtLastRequest >=
      MIN_SUCCESSES_BETWEEN_REQUESTS
  );
}
