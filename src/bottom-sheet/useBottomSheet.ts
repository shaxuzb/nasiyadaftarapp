import { useContext } from "react";
import { BottomSheetContext, BottomSheetOpenContext } from "./context";

export function useBottomSheet() {
  const ctx = useContext(BottomSheetContext);
  if (!ctx) {
    throw new Error("useBottomSheet must be used within BottomSheetProvider");
  }
  return ctx;
}

/** Whether a sheet is open or on its way. Re-renders as that changes. */
export function useIsBottomSheetOpen() {
  return useContext(BottomSheetOpenContext);
}
