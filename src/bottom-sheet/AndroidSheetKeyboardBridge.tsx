import { Platform } from "react-native";
import { KEYBOARD_STATUS, useBottomSheetInternal } from "@gorhom/bottom-sheet";
import { useAnimatedReaction, useSharedValue } from "react-native-reanimated";
import {
  KeyboardController,
  useGenericKeyboardHandler,
} from "react-native-keyboard-controller";

/** Repair Android's first keyboardDidShow reporting height=0 on edge-to-edge. */
export function AndroidSheetKeyboardBridge() {
  const android = Platform.OS === "android";
  const { animatedKeyboardState } = useBottomSheetInternal();
  const nativeHeight = useSharedValue(
    android && KeyboardController.isVisible()
      ? KeyboardController.state().height
      : 0,
  );

  // This hook does not change the Activity's soft-input mode. Gorhom remains
  // responsible for positioning the sheet and its sticky footer.
  useGenericKeyboardHandler({
    onStart: (event) => {
      "worklet";
      nativeHeight.value = event.height;
    },
    onEnd: (event) => {
      "worklet";
      nativeHeight.value = event.height;
    },
  }, [nativeHeight]);

  useAnimatedReaction(
    () => ({ native: nativeHeight.value, keyboard: animatedKeyboardState.get() }),
    ({ native, keyboard }) => {
      // Observe target as well: Android may deliver the IME event before focus.
      // Preserve all valid RN measurements and never interfere with dismissal.
      if (
        android &&
        keyboard.target &&
        keyboard.status === KEYBOARD_STATUS.SHOWN &&
        keyboard.height === 0 &&
        Number.isFinite(native) &&
        native > 0
      ) {
        animatedKeyboardState.set((state) => ({ ...state, height: native }));
      }
    },
    [android, animatedKeyboardState, nativeHeight],
  );

  return null;
}
