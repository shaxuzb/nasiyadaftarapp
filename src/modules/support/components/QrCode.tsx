import React, { memo, useMemo } from "react";
import { PixelRatio, StyleSheet, View } from "react-native";

import { buildQrMatrix } from "../utils/qrMatrix";

interface Props {
  /** What the code says when scanned. */
  value: string;
  /** Width and height of the code itself, without the white margin. */
  size: number;
  accessibilityLabel: string;
}

// A code is always dark on white, whatever the app's theme: that is what
// cameras expect, and a dark-mode code on a dark card often will not scan.
const DARK = "#000000";
const LIGHT = "#FFFFFF";
// The empty border a scanner needs to find the code's edge: four modules.
const QUIET_MODULES = 4;

/**
 * A QR code drawn with plain views, so it needs no native drawing library and
 * no new app build.
 *
 * Every edge is snapped to a physical pixel. Without that, on screens whose
 * density is not a whole number the rows land on fractions of a pixel and
 * hairline white gaps open between them, which is enough to stop a scan.
 */
export const QrCode = memo(function QrCode({
  value,
  size,
  accessibilityLabel,
}: Props) {
  const matrix = useMemo(() => buildQrMatrix(value), [value]);

  const cells = useMemo(() => {
    if (!matrix) return null;
    const moduleSize = size / matrix.size;
    const snap = (modules: number) =>
      PixelRatio.roundToNearestPixel(modules * moduleSize);

    return matrix.rows.flatMap((runs, y) => {
      const top = snap(y);
      const height = snap(y + 1) - top;
      return runs.map(([start, length]) => {
        const left = snap(start);
        return (
          <View
            key={`${y}:${start}`}
            style={[
              styles.cell,
              { top, left, height, width: snap(start + length) - left },
            ]}
          />
        );
      });
    });
  }, [matrix, size]);

  if (!matrix || !cells) return null;

  const quiet = PixelRatio.roundToNearestPixel(
    (size / matrix.size) * QUIET_MODULES,
  );

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.frame, { padding: quiet }]}
    >
      <View style={{ width: size, height: size }}>{cells}</View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    borderRadius: 16,
    backgroundColor: LIGHT,
  },
  cell: {
    position: "absolute",
    backgroundColor: DARK,
  },
});
