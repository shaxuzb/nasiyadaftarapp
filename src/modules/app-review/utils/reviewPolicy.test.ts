import assert from "node:assert/strict";
import {
  ANDROID_DAYS_BETWEEN_REQUESTS,
  DAYS_BETWEEN_REQUESTS,
  INITIAL_REVIEW_PROMPT_STATE,
  MIN_DAYS_BEFORE_FIRST_REQUEST,
  MIN_SUCCESSES_BEFORE_FIRST_REQUEST,
  MIN_SUCCESSES_BETWEEN_REQUESTS,
  markReviewRequested,
  parseReviewPromptState,
  recordReviewSuccess,
  shouldRequestReview,
  // @ts-expect-error Standalone Node test imports the TypeScript module directly.
} from "./reviewPolicy.ts";

const DAY = 24 * 60 * 60 * 1000;
const start = Date.UTC(2026, 0, 1);

function after(successes: number, from = INITIAL_REVIEW_PROMPT_STATE, at = start) {
  let state = from;
  for (let index = 0; index < successes; index++) {
    state = recordReviewSuccess(state, at);
  }
  return state;
}

/* A new user is left alone. */

assert.equal(shouldRequestReview(INITIAL_REVIEW_PROMPT_STATE, start), false);

const eager = after(MIN_SUCCESSES_BEFORE_FIRST_REQUEST);
const firstMoment = start + MIN_DAYS_BEFORE_FIRST_REQUEST * DAY;
if (MIN_DAYS_BEFORE_FIRST_REQUEST > 0) {
  assert.equal(
    shouldRequestReview(eager, firstMoment - 1),
    false,
    "Enough entries before the waiting days have passed is not enough",
  );
}

const patientButLight = after(MIN_SUCCESSES_BEFORE_FIRST_REQUEST - 1);
assert.equal(
  shouldRequestReview(patientButLight, start + 30 * DAY),
  false,
  "Time alone is not enough: the user has to have used the app",
);

/* Enough saved transactions, after the waiting days if any, earn the first request. */

assert.equal(shouldRequestReview(eager, firstMoment), true);

/* After asking, the app stays quiet for a long time. */

const asked = markReviewRequested(eager, firstMoment);
assert.equal(asked.successCountAtLastRequest, eager.successCount);
assert.equal(
  shouldRequestReview(after(100, asked), firstMoment + 30 * DAY),
  false,
  "Heavy use must not bring the dialog back inside the cooldown",
);

const cooledDown = firstMoment + DAYS_BETWEEN_REQUESTS * DAY;
assert.equal(
  shouldRequestReview(asked, cooledDown),
  false,
  "A user who stopped using the app is not asked again",
);
assert.equal(
  shouldRequestReview(after(MIN_SUCCESSES_BETWEEN_REQUESTS - 1, asked), cooledDown),
  false,
);
assert.equal(
  shouldRequestReview(after(MIN_SUCCESSES_BETWEEN_REQUESTS, asked), cooledDown),
  true,
);

/* Android may ask again sooner; iOS at the same moment may not. */

const androidCooledDown = firstMoment + ANDROID_DAYS_BETWEEN_REQUESTS * DAY;
const stillActive = after(MIN_SUCCESSES_BETWEEN_REQUESTS, asked);
assert.ok(ANDROID_DAYS_BETWEEN_REQUESTS < DAYS_BETWEEN_REQUESTS);
assert.equal(
  shouldRequestReview(stillActive, androidCooledDown, ANDROID_DAYS_BETWEEN_REQUESTS),
  true,
);
assert.equal(
  shouldRequestReview(stillActive, androidCooledDown - 1, ANDROID_DAYS_BETWEEN_REQUESTS),
  false,
);
assert.equal(
  shouldRequestReview(stillActive, androidCooledDown),
  false,
  "Without an interval the iOS one applies",
);

/* The first success time is kept, not moved by later ones. */

assert.equal(after(3, eager, start + 9 * DAY).firstSuccessAt, start);

/* Stored state survives a round trip and damage. */

assert.deepEqual(parseReviewPromptState(JSON.stringify(asked)), asked);
assert.deepEqual(parseReviewPromptState(null), INITIAL_REVIEW_PROMPT_STATE);
assert.deepEqual(parseReviewPromptState("{not json"), INITIAL_REVIEW_PROMPT_STATE);
assert.deepEqual(
  parseReviewPromptState('{"successCount":"7","firstSuccessAt":-1}'),
  INITIAL_REVIEW_PROMPT_STATE,
  "Values of the wrong type must not be trusted",
);

console.log("Store review prompt policy tests passed");
