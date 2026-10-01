import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Keyboard, Platform } from "react-native";
import * as StoreReview from "expo-store-review";

import {
  ANDROID_DAYS_BETWEEN_REQUESTS,
  DAYS_BETWEEN_REQUESTS,
  MIN_SUCCESSES_BEFORE_FIRST_REQUEST,
  markReviewRequested,
  parseReviewPromptState,
  recordReviewSuccess,
  shouldRequestReview,
  type ReviewPromptState,
} from "../utils/reviewPolicy";

const STORAGE_KEY = "app_review_prompt_v1";

/**
 * How long after a saved transaction the check runs. By then the sheet has
 * closed and the "saved" toast has been read, so nothing here competes with
 * the close animation, and the dialog does not land on top of the form.
 */
const SETTLE_DELAY_MS = 1800;

// Read from storage once per app run; every later transaction uses memory.
let cachedState: ReviewPromptState | null = null;
// One check at a time: saves in quick succession are counted in order.
let queue: Promise<void> = Promise.resolve();

async function loadState(): Promise<ReviewPromptState> {
  if (!cachedState) {
    cachedState = parseReviewPromptState(await AsyncStorage.getItem(STORAGE_KEY));
  }
  return cachedState;
}

async function saveState(state: ReviewPromptState): Promise<void> {
  cachedState = state;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Why asking now would interrupt the user, or null when it would not: they
 * have moved on to typing the next entry, or left the app.
 */
function getBusyReason(): string | null {
  if (AppState.currentState !== "active") {
    return `the app is ${AppState.currentState ?? "not active"}`;
  }
  return Keyboard.isVisible() ? "the keyboard is open" : null;
}

// The stores give no feedback, so while developing this is the only way to
// tell why the dialog did or did not appear.
function trace(message: string): void {
  if (__DEV__) console.log(`[store-review] ${message}`);
}

async function countAndMaybeAsk(): Promise<void> {
  const now = Date.now();
  const state = recordReviewSuccess(await loadState(), now);
  await saveState(state);

  // A development build ignores the waiting days and the cooldown, so the
  // dialog can be tested without waiting or reinstalling. iOS shows it every
  // time there and submits nothing.
  const due = __DEV__
    ? state.successCount >= MIN_SUCCESSES_BEFORE_FIRST_REQUEST
    : shouldRequestReview(
        state,
        now,
        Platform.OS === "android"
          ? ANDROID_DAYS_BETWEEN_REQUESTS
          : DAYS_BETWEEN_REQUESTS,
      );
  if (!due) {
    trace(`not yet: ${state.successCount} saved`);
    return;
  }
  const busyReason = getBusyReason();
  if (busyReason) {
    trace(`skipped: ${busyReason}`);
    return;
  }
  // False where the store dialog cannot be shown at all, such as TestFlight.
  if (!(await StoreReview.isAvailableAsync()) || !(await StoreReview.hasAction())) {
    trace("skipped: the store dialog is not available in this build");
    return;
  }

  await StoreReview.requestReview();
  trace("requested; the store decides whether the dialog is shown");
  // Recorded only once the request went through, so a failure is retried on a
  // later transaction instead of costing a four-month wait.
  await saveState(markReviewRequested(state, Date.now()));
}

/**
 * Call after a transaction has been saved. Returns at once; everything else
 * happens later and never throws into the caller, so a rating can not get in
 * the way of saving a debt or a payment.
 */
export function noteSuccessfulTransaction(): void {
  setTimeout(() => {
    queue = queue
      .then(countAndMaybeAsk)
      .catch((error: unknown) => trace(`failed: ${String(error)}`));
  }, SETTLE_DELAY_MS);
}
