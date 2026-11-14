import { useEffect, useRef } from "react";
import { hashKey, useQueryClient, type QueryKey } from "@tanstack/react-query";

import type { Saved } from "../utils/savedData";

/**
 * Puts the device's copy on screen at once, before the server has answered:
 * the screen opens with its data, and the request then replaces it. The copy
 * keeps the time it was saved, so it counts as stale and is fetched again.
 *
 * Only into an empty query: what is already there is never overwritten.
 */
export function useSeedFromSaved<T>(
  queryKey: QueryKey,
  load: () => Promise<Saved<T> | null>,
  enabled: boolean,
): void {
  const queryClient = useQueryClient();
  const keyRef = useRef(queryKey);
  keyRef.current = queryKey;
  const loadRef = useRef(load);
  loadRef.current = load;
  const queryHash = hashKey(queryKey);

  useEffect(() => {
    if (!enabled) return undefined;
    const key = keyRef.current;
    if (queryClient.getQueryData(key) !== undefined) return undefined;
    let active = true;
    void loadRef.current().then((saved) => {
      if (!active || !saved || queryClient.getQueryData(key) !== undefined) return;
      queryClient.setQueryData(key, saved.data, { updatedAt: saved.savedAt });
    });
    return () => {
      active = false;
    };
  }, [enabled, queryClient, queryHash]);
}
