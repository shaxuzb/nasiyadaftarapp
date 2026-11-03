import { useEffect, useRef } from "react";
import { useIsFocused } from "@react-navigation/native";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Refetches a screen's query when something changed it, but only while the
 * screen is in view: at once if it is, otherwise when the user comes back.
 *
 * A tab stays mounted once visited, so a query invalidated while the user is
 * elsewhere would refetch out of sight, and again for every further change.
 * Invalidate such a query with `refetchType: "none"`: it is only marked, and
 * this hook fetches it once, when it is looked at. A query nothing changed is
 * not fetched.
 *
 * For screens only: it needs the navigator.
 */
export function useRefetchInvalidatedOnFocus(queryKey: QueryKey) {
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;
  const queryHash = hashKey(queryKey);

  useEffect(() => {
    if (!isFocused) return;
    const cache = queryClient.getQueryCache();
    const refetchIfInvalidated = () => {
      const state = cache.get(queryHash)?.state;
      // Already on its way (a first load, a pull to refresh): nothing to add.
      if (!state?.isInvalidated || state.fetchStatus === "fetching") return;
      void queryClient.refetchQueries({ queryKey: keyRef.current, exact: true });
    };

    refetchIfInvalidated();
    // Only on the invalidation itself: a failed refetch leaves the query
    // marked, and reacting to every update would retry it without end.
    return cache.subscribe((event) => {
      if (
        event.type === "updated" &&
        event.action.type === "invalidate" &&
        event.query.queryHash === queryHash
      ) {
        refetchIfInvalidated();
      }
    });
  }, [isFocused, queryClient, queryHash]);
}
