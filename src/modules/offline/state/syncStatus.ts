import { useSyncExternalStore } from "react";

/**
 * Whether a round with the server is running now, and a way for a screen to
 * ask for one ("Hozir yuborish"). The controller that runs the rounds
 * listens here; screens only read and ask.
 */
let syncing = false;
const listeners = new Set<() => void>();
const requestListeners = new Set<() => void>();

export function setSyncing(next: boolean): void {
  if (syncing === next) return;
  syncing = next;
  for (const listener of listeners) listener();
}

/** Asks for a round now (ignored while one runs: that one already covers it). */
export function requestSync(): void {
  for (const listener of requestListeners) listener();
}

export function onSyncRequested(listener: () => void): () => void {
  requestListeners.add(listener);
  return () => {
    requestListeners.delete(listener);
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => syncing;

export function useIsSyncing(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
