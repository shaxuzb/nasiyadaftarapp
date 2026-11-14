import { useSyncExternalStore } from "react";

/**
 * Whether the server is known to be down: a request had no answer, or a
 * 502/503/504. Learnt from the app's own requests while it is up (nothing is
 * sent just to check), and from GET /health while it is down, until that
 * answers. Kept free of React Native so plain modules can read it.
 */
let down = false;
const listeners = new Set<() => void>();
const checkListeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function reportServerDown(): void {
  if (down) return;
  down = true;
  emit();
}

export function reportServerUp(): void {
  if (!down) return;
  down = false;
  emit();
}

export function isServerDown(): boolean {
  return down;
}

/** Asks for a GET /health now (a write was just queued, the user tapped "check"). */
export function requestHealthCheck(): void {
  for (const listener of checkListeners) listener();
}

export function onHealthCheckRequested(listener: () => void): () => void {
  checkListeners.add(listener);
  return () => {
    checkListeners.delete(listener);
  };
}

export function subscribeServerStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIsServerDown(): boolean {
  return useSyncExternalStore(subscribeServerStatus, isServerDown, isServerDown);
}
