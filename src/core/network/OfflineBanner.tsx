import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { getNetworkCopy } from "./networkCopy";
import { useNetworkStatus } from "./NetworkProvider";

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const { locale } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  if (!isOffline) return null;

  const copy = getNetworkCopy(locale);

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          paddingTop: insets.top + 6,
          backgroundColor: theme.warningColor,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.text }]}>{copy.offline}</Text>
      <Text style={[styles.message, { color: theme.text }]}>
        {copy.internetRequired}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
  },
  message: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: "500",
    opacity: 0.85,
  },
});
