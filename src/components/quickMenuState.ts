import { useSyncExternalStore } from "react";

/**
 * Whether the quick menu (organization, language, currency) is open. It is
 * drawn once, over the whole app and under the bottom sheets, so a sheet it
 * opens appears on top while the menu stays where it is.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function openQuickMenu(): void {
  if (open) return;
  open = true;
  emit();
}

export function closeQuickMenu(): void {
  if (!open) return;
  open = false;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => open;

export function useQuickMenuOpen(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
