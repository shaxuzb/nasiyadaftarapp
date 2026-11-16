import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * An organization just created on this phone whose currency has not been
 * chosen yet. Set when it is created, cleared once the currency is chosen:
 * the choice is asked for exactly once, and again only if the app was closed
 * before it was made. Kept on the phone, so a restart does not skip it.
 */
export interface PendingCurrencySetup {
  userId: number;
  organizationId: number;
}

const STORAGE_KEY = "organization_currency_setup_v1";

let pending: PendingCurrencySetup | null = null;
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function parse(raw: string | null): PendingCurrencySetup | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingCurrencySetup> | null;
    return typeof value?.userId === "number" && typeof value.organizationId === "number"
      ? { userId: value.userId, organizationId: value.organizationId }
      : null;
  } catch {
    return null;
  }
}

function ensureLoaded(): Promise<void> {
  loaded ??= AsyncStorage.getItem(STORAGE_KEY)
    .catch(() => null)
    .then((raw) => {
      // Something set while reading wins over what was stored before.
      if (pending === null) pending = parse(raw);
      emit();
    });
  return loaded;
}

/** The organization just created: its currency is asked for next. */
export async function markCurrencySetupPending(userId: number, organizationId: number): Promise<void> {
  pending = { userId, organizationId };
  emit();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  } catch {
    // Kept in memory for this run: asked for now all the same.
  }
}

/** The currency was chosen: never asked for again. */
export async function clearCurrencySetupPending(): Promise<void> {
  pending = null;
  emit();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // At worst the choice is offered once more, already made.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => pending;

export function usePendingCurrencySetup(): PendingCurrencySetup | null {
  useEffect(() => {
    void ensureLoaded();
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
