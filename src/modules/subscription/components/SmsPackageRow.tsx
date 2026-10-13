import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import { formatLocalizedCurrency, useTranslation } from "../../../i18n";
import { radius, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import type { SmsPackage } from "../types";
import { getPricePerSms } from "../utils/smsPackage";
import { DiscountSummary } from "./PriceDiscount";

interface Props {
  item: SmsPackage;
  /** Goes on to paying for this package. */
  onPress: (item: SmsPackage) => void;
}

/**
 * One SMS package on one line: its name, what a single SMS works out to, and
 * the price with any discount above it. Tapping the row goes on to payment.
 *
 * The plans screen and the "buy SMS" sheet both list packages with this, so a
 * package looks and behaves the same wherever it is offered.
 */
export const SmsPackageRow = memo(function SmsPackageRow({
  item,
  onPress,
}: Props) {
  const theme = useTheme();
  const { locale, t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const price = formatLocalizedCurrency(item.price, locale);
  const perSms = getPricePerSms(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${price}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={20}
          color={theme.primary}
        />
      </View>

      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {/* What one SMS works out to, so a bigger package can be seen to
            cost less each. */}
        {perSms !== null ? (
          <Text style={styles.perSms} numberOfLines={1}>
            {t("subscription.perSms", {
              price: formatLocalizedCurrency(perSms, locale),
            })}
          </Text>
        ) : null}
      </View>

      <View style={styles.priceColumn}>
        <DiscountSummary product={item} />
        <Text style={styles.price} numberOfLines={1}>
          {price}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.tabBarBorder,
    },
    icon: {
      width: 38,
      height: 38,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    copy: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "800",
    },
    perSms: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    priceColumn: {
      flexShrink: 0,
      alignItems: "flex-end",
      gap: 2,
    },
    price: {
      ...typography.bodyMedium,
      color: theme.primary,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    pressed: { opacity: 0.72 },
  });
