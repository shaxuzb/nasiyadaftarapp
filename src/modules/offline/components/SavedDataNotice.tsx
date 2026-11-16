import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useNetworkStatus } from "../../../core/network/NetworkProvider";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius } from "../../../theme";
import type { AppTheme } from "../../../types";
import { useIsServerDown } from "../state/serverStatus";

/**
 * Offline mode: the phone is online and the server is down. Writes are kept
 * on the phone and sent once it is back. The phone's own internet being off
 * is not offline mode: nothing is written then.
 */
export function useOfflineMode(): boolean {
  const { isOffline } = useNetworkStatus();
  const serverDown = useIsServerDown();
  return serverDown && !isOffline;
}

/**
 * A small "Oflayn rejim" label while the app works from the phone. That is
 * all the user needs to know: what they write is kept and sent by itself
 * once the server is back. Nothing while the server answers.
 */
export const SavedDataNotice = memo(function SavedDataNotice({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const offlineMode = useOfflineMode();
  if (!offlineMode && !isOffline) return null;

  // No internet: said plainly, in red (nothing can be written). Server down:
  // offline mode, in amber (work goes on).
  const color = isOffline ? theme.dangerColor : theme.warningColor;
  const text = isOffline ? t("offline.connection.noInternetTitle") : t("offline.modeTitle");
  return (
    <View
      style={[styles.label, { borderColor: `${color}55`, backgroundColor: `${color}14` }, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
    >
      <Ionicons name={isOffline ? "wifi-outline" : "cloud-offline-outline"} size={14} color={color} />
      <Text style={styles.labelText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    label: {
      alignSelf: "flex-start",
      maxWidth: "100%",
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      borderRadius: radius.full,
      borderWidth: 1,
    },
    labelText: {
      flexShrink: 1,
      color: theme.text,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
    },
  });
