import { useCallback } from "react";
import { BackHandler } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useBottomSheet } from "./useBottomSheet";

export function BottomSheetBackHandler() {
  const { isOpen, closeSheet } = useBottomSheet();

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (isOpen) {
            closeSheet();
            return true;
          }
          return false;
        },
      );

      return () => {
        subscription.remove();
      };
    }, [closeSheet, isOpen]),
  );

  return null;
}
