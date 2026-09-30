import React, { memo, useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { AppTheme } from "../../../types";

interface Props {
  /** Where the pill sits; callers pin it to a corner of their card. */
  style?: StyleProp<ViewStyle>;
}

/**
 * A small pill pinned to a customer card's corner. It takes no room in the
 * layout and lets touches through to the card; the full warning goes to
 * screen readers.
 */
export const BlacklistBadge = memo(function BlacklistBadge({ style }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      accessible
      accessibilityLabel={t("customers.blacklistWarning")}
      pointerEvents="none"
      style={[styles.badge, style]}
    >
      <Ionicons name="warning" size={10} color={theme.dangerColor} />
      <Text style={styles.text} numberOfLines={1}>
        {t("customers.blacklistBadge")}
      </Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.dangerColor,
      backgroundColor: theme.debtBg,
    },
    text: {
      color: theme.dangerColor,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "700",
    },
  });
