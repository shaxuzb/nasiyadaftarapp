// @ts-expect-error This standalone Node test imports the TypeScript module directly.
import { getQueryLoadingState } from "./queryLoading.ts";

function assert(value: boolean, message: string) {
  if (!value) throw new Error(message);
}

const initial = getQueryLoadingState(true, true);
assert(initial.isLoading, "A pending query must show initial loading");
assert(!initial.isRefreshing, "Initial loading is not a background refresh");

const refreshing = getQueryLoadingState(false, true);
assert(
  !refreshing.isLoading,
  "Cached data must not be replaced by a full loading state during refresh",
);
assert(refreshing.isRefreshing, "A cached fetching query must be a refresh");

const idle = getQueryLoadingState(false, false);
assert(!idle.isLoading && !idle.isRefreshing, "Idle query must have no loading state");

console.log("Query loading state tests passed");
