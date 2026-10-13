import { useCallback, useMemo, useRef, type RefObject } from "react";
import type { BottomSheetModal } from "@gorhom/bottom-sheet";

import { useDismissOnAppLock } from "../modules/pin-auth/hooks/useDismissOnAppLock";

/**
 * A standalone bottom sheet that closes when the PIN screen takes over, and
 * is only ever told to close while it is actually open.
 *
 * The second half matters as much as the first. Asking the sheet library to
 * dismiss a sheet that is not presented is not a no-op: it marks the sheet
 * "dismissing", finds nothing on screen to animate away, and so never clears
 * the mark. From then on `present()` mounts the sheet but the library refuses
 * to draw it, and the button that opens it appears dead until the screen is
 * rebuilt. The app lock fires for every screen that is mounted, most of which
 * have their sheet closed, so every one of them has to go through this guard.
 *
 * Present and dismiss the sheet through what this returns, and pass
 * `handleDismissed` to the sheet's `onDismiss` (or call it from there).
 */
export function useDismissSheetOnAppLock(
  sheetRef: RefObject<BottomSheetModal | null>,
) {
  const presentedRef = useRef(false);

  const present = useCallback(() => {
    presentedRef.current = true;
    sheetRef.current?.present();
  }, [sheetRef]);

  const dismiss = useCallback(() => {
    if (!presentedRef.current) return;
    sheetRef.current?.dismiss();
  }, [sheetRef]);

  const handleDismissed = useCallback(() => {
    presentedRef.current = false;
  }, []);

  // Must not stay open on top of the PIN screen.
  useDismissOnAppLock(dismiss);

  return useMemo(
    () => ({ present, dismiss, handleDismissed }),
    [dismiss, handleDismissed, present],
  );
}
