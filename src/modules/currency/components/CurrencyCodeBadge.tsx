import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../../../hooks/useTheme";
import type { AppTheme } from "../../../types";

/**
 * A currency told by its code: "UZS", "USD", "RUB". Read the same in every
 * language, and never mistaken for a language the way a country's flag was.
 */
export const CurrencyCodeBadge = memo(function CurrencyCodeBadge({
  code,
  selected = false,
  compact = false,
  style,
}: {
  code: string;
  /** The chosen one: filled. */
  selected?: boolean;
  /** In a row's 38px icon place (Settings): the code alone, no frame of its own. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={[compact ? styles.compact : styles.badge, selected && styles.badgeSelected, style]}
    >
      <Text
        style={[styles.code, compact && styles.codeCompact, selected && styles.codeSelected]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {code}
      </Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    badge: {
      width: 52,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderCurve: "continuous",
      borderWidth: 1,
      borderColor: `${theme.primary}33`,
      backgroundColor: theme.primaryLight,
    },
    compact: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
    badgeSelected: { borderColor: theme.primary, backgroundColor: theme.primary },
    code: {
      color: theme.primary,
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      letterSpacing: 0.6,
      fontVariant: ["tabular-nums"],
    },
    codeCompact: { fontSize: 12, lineHeight: 16, letterSpacing: 0.3 },
    codeSelected: { color: "#FFFFFF" },
  });
