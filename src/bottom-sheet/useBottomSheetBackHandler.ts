import { useEffect, useRef } from "react";

import { registerBackHandler } from "./backHandlerRegistry";

export function useBottomSheetBackHandler(
  enabled: boolean,
  onBack: () => void,
): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    return registerBackHandler(() => {
      onBackRef.current();
      return true;
    });
  }, [enabled]);
}
