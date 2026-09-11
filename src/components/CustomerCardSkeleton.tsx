import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing } from "../theme";

export function CustomerCardSkeleton() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}
    >
      <View style={styles.row}>
        <View
          style={[styles.avatar, { backgroundColor: theme.inputBackground }]}
        />
        <View style={styles.info}>
          <View
            style={[
              styles.line,
              { width: "55%", backgroundColor: theme.inputBackground },
            ]}
          />
          <View
            style={[
              styles.line,
              {
                width: "40%",
                backgroundColor: theme.inputBackground,
                marginTop: 8,
              },
            ]}
          />
        </View>
      </View>
      {/* <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <View
          style={[styles.btn, { backgroundColor: theme.inputBackground }]}
        />
        <View
          style={[styles.btn, { backgroundColor: theme.inputBackground }]}
        />
      </View> */}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  info: { flex: 1 },
  line: {
    height: 12,
    borderRadius: 6,
  },
  footer: {
    flexDirection: "row",
    borderTopWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  btn: {
    flex: 1,
    height: 34,
    borderRadius: radius.md,
  },
});
