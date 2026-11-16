import type { ViewStyle } from "react-native";

import type { AppTheme } from "../types";

/**
 * How a round action button floating over a list stands off the page.
 *
 * In light mode a dark shadow does it. On a dark page a dark shadow cannot be
 * seen, and the button seemed to sink into the background; there it glows in
 * its own colour instead, with a faint light ring for its edge.
 */
export function floatingActionElevation(theme: AppTheme, dark: boolean): ViewStyle {
  return dark
    ? {
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.55,
        shadowRadius: 14,
        elevation: 10,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.18)",
      }
    : {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
      };
}
