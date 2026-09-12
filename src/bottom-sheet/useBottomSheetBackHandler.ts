import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

export function useBottomSheetBackHandler(
  enabled: boolean,
  onBack: () => void,
): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBackRef.current();
        return true;
      },
    );

    return () => subscription.remove();
  }, [enabled]);
}
