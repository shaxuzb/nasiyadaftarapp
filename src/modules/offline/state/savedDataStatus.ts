import { useSyncExternalStore } from "react";

/**
 * Whether the screens are showing the device's copy because the server could
 * not be reached, and from when that copy is (the oldest one shown). Null
 * when the server is answering.
 */
let shownSince: number | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** A screen fell back on the copy saved at `savedAt`. */
export function reportSavedDataShown(savedAt: number): void {
  const next = shownSince === null ? savedAt : Math.min(shownSince, savedAt);
  if (next === shownSince) return;
  shownSince = next;
  emit();
}

/** The server answered: what is on screen is current again. */
export function reportServerAnswered(): void {
  if (shownSince === null) return;
  shownSince = null;
  emit();
}

export function getSavedDataShownSince(): number | null {
  return shownSince;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The time of the copy on screen, or null while the server answers. */
export function useSavedDataShownSince(): number | null {
  return useSyncExternalStore(subscribe, getSavedDataShownSince, getSavedDataShownSince);
}
