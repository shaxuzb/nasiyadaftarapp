import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";

import { CONTENT_MAX_WIDTH } from "../components/ResponsiveScreen";

/**
 * Side margins that keep a bottom sheet to the same centred column as the
 * screen behind it, for the sheet's `style` prop.
 *
 * A sheet is drawn over the whole window, outside the screen's own frame, so
 * on a tablet it would otherwise span edge to edge while the content it
 * belongs to sits in a 640-point column. A sheet positions itself from both
 * edges, which is why this is a margin worked out from the window rather than
 * a max-width.
 *
 * Undefined on a phone, where nothing is to change. Changing the style does
 * not remount the sheet, so resizing an iPad window keeps what was typed.
 */
export function useSheetFrameStyle(): ViewStyle | undefined {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const inset = Math.floor((width - CONTENT_MAX_WIDTH) / 2);
    return inset > 0 ? { marginHorizontal: inset } : undefined;
  }, [width]);
}
