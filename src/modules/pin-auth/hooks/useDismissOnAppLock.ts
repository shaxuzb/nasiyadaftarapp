import { useEffect, useRef } from "react";
import { Keyboard } from "react-native";

import { useAppLock } from "../context/AppLockContext";

/**
 * Closes something the moment the PIN screen takes over.
 *
 * The PIN screen is a layer inside the app, while bottom sheets and dialogs
 * are drawn in layers above it. Left alone, whatever was open stays on top of
 * the lock: a sheet with a customer's name and balance, readable and tappable
 * by whoever picked the phone up. Each such surface calls this with its own
 * way of closing.
 *
 * What was being typed in it is lost. That is the right trade for a lock: the
 * alternative is keeping private data on a screen that says it is locked.
 */
export function useDismissOnAppLock(dismiss: () => void): void {
  const { isLocked, setupRequired } = useAppLock();
  const covered = isLocked || setupRequired;
  // The latest closure, without re-running the effect each time it changes.
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!covered) return;
    // A keyboard left up would sit over the PIN pad.
    Keyboard.dismiss();
    dismissRef.current();
  }, [covered]);
}
