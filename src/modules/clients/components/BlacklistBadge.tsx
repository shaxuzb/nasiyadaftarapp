import React, { memo, useMemo } from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// From the hook's own file, not the folder's index: the index pulls in every
// sheet, and one of them renders this badge.
import { useBottomSheet } from "../../../bottom-sheet/useBottomSheet";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { AppTheme } from "../../../types";

interface Props {
  /** Where the pill sits; callers pin it to a corner or put it in a line. */
  style?: StyleProp<ViewStyle>;
  /**
   * With a customer the pill is a button that opens the list of organizations
   * that blacklisted them. Without one it is only a label.
   */
  customerId?: number;
  customerName?: string;
}

/**
 * The "blacklisted" pill shown beside a customer, the same wherever a customer
 * appears. It takes no room in the layout; the full warning goes to screen
 * readers.
 */
export const BlacklistBadge = memo(function BlacklistBadge({
  style,
  customerId,
  customerName,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { openSheet } = useBottomSheet();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const content = (
    <>
      <Ionicons name="warning" size={10} color={theme.dangerColor} />
      <Text style={styles.text} numberOfLines={1}>
        {t("customers.blacklistBadge")}
      </Text>
    </>
  );

  if (customerId === undefined) {
    return (
      <View
        accessible
        accessibilityLabel={t("customers.blacklistWarning")}
        pointerEvents="none"
        style={[styles.badge, style]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("customers.blacklistWarning")}
      accessibilityHint={t("customers.blacklistDetailsHint")}
      // The pill is small and sits on a card that is itself a button, so it
      // gets a generous area of its own to be hit on purpose.
      hitSlop={10}
      onPress={() =>
        openSheet("blacklistOrganizations", {
          customerId,
          customerName: customerName ?? "",
        })
      }
      style={({ pressed }) => [styles.badge, pressed && styles.pressed, style]}
    >
      {content}
      <Ionicons name="chevron-forward" size={10} color={theme.dangerColor} />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    badge: {
      flexShrink: 0,
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
    pressed: { opacity: 0.6 },
  });
