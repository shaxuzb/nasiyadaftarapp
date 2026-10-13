import React, { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "../hooks/useTheme";

/**
 * The widest a screen's content gets. Every screen was designed for a phone;
 * on a tablet, cards and forms stretched edge to edge are harder to read and
 * put each row's name and amount a hand's width apart. Past this width the
 * content stays a centred column and the rest is background.
 */
export const CONTENT_MAX_WIDTH = 640;

/**
 * Frames a screen as a centred column no wider than `CONTENT_MAX_WIDTH`.
 *
 * On a phone the limit is never reached, so nothing changes there. The frame
 * is always rendered, never added or removed by width, so resizing the window
 * on an iPad (Split View, Stage Manager) cannot remount the screen and lose
 * what the user was typing. It is layout only: no measuring, no re-render.
 */
export function ResponsiveScreen({ children }: { children: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={[styles.frame, { backgroundColor: theme.background }]}>
      <View style={styles.column}>{children}</View>
    </View>
  );
}

/** For a navigator's `screenLayout`: every screen it shows gets the frame. */
export function renderResponsiveScreen({ children }: { children: ReactNode }) {
  return <ResponsiveScreen>{children}</ResponsiveScreen>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: "center" },
  column: { flex: 1, width: "100%", maxWidth: CONTENT_MAX_WIDTH },
});
