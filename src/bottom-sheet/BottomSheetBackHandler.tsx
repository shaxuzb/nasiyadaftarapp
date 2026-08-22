import { BackHandler } from "react-native";
import { useEffect } from "react";

import { handleRegisteredBackPress } from "./backHandlerRegistry";

export function BottomSheetBackHandler() {
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleRegisteredBackPress,
    );

    return () => subscription.remove();
  }, []);

  return null;
}
