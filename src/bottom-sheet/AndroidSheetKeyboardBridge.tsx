import { useEffect } from "react";
import { Keyboard, Platform } from "react-native";
import { KEYBOARD_STATUS, useBottomSheetInternal } from "@gorhom/bottom-sheet";
import {
  runOnUI,
  useAnimatedReaction,
  useSharedValue,
} from "react-native-reanimated";
import {
  KeyboardController,
  useGenericKeyboardHandler,
} from "react-native-keyboard-controller";

/** Repair Android's first keyboardDidShow reporting height=0 on edge-to-edge. */
export function AndroidSheetKeyboardBridge() {
  const android = Platform.OS === "android";
  const { animatedKeyboardState } = useBottomSheetInternal();
  const nativeHeight = useSharedValue(0);

  useEffect(() => {
    if (!android) return undefined;

    const setHeightOnUI = (height: number) => {
      runOnUI((nextHeight: number) => {
        "worklet";
        nativeHeight.value = nextHeight;
      })(height);
    };

    // On the first Android focus, BottomSheet can receive its keyboardDidShow
    // event before the input target/layout is registered. Keep the real native
    // height and let the reaction below replay it once the target is available.
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        const eventHeight = event.endCoordinates?.height ?? 0;
        const controllerHeight = KeyboardController.state().height;
        const height = Math.max(eventHeight, controllerHeight);
        if (height > 0) setHeightOnUI(height);
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setHeightOnUI(0);
    });

    if (KeyboardController.isVisible()) {
      const height = KeyboardController.state().height;
      if (height > 0) setHeightOnUI(height);
    }

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [android, nativeHeight]);

  // This hook does not change the Activity's soft-input mode. Gorhom remains
  // responsible for positioning the sheet and its sticky footer.
  useGenericKeyboardHandler(
    {
      onStart: (event) => {
        "worklet";
        nativeHeight.value = event.height;
      },
      onMove: (event) => {
        "worklet";
        if (event.height > 0) nativeHeight.value = event.height;
      },
      onEnd: (event) => {
        "worklet";
        nativeHeight.value = event.height;
      },
      onInteractive: (event) => {
        "worklet";
        if (event.height > 0) nativeHeight.value = event.height;
      },
    },
    [nativeHeight],
  );

  useAnimatedReaction(
    () => ({
      native: nativeHeight.value,
      keyboard: animatedKeyboardState.get(),
    }),
    ({ native, keyboard }) => {
      // Observe target as well: Android may deliver the IME event before focus.
      // Preserve all valid RN measurements and never interfere with dismissal.
      if (
        android &&
        keyboard.target &&
        keyboard.status === KEYBOARD_STATUS.SHOWN &&
        keyboard.height < native &&
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
