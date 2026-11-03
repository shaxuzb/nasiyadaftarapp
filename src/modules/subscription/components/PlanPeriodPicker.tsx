import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "../../../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedNumber,
  useTranslation,
} from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { getPriceDiscount } from "../utils/discount";
import type { SubscriptionPlanPeriod } from "../utils/planPeriods";
import { DiscountBadge, OldPrice } from "./PriceDiscount";

interface Props {
  periods: readonly SubscriptionPlanPeriod[];
  /** The chosen term in months; null when nothing is chosen yet. */
  value: number | null;
  onChange: (months: number) => void;
  disabled?: boolean;
}

/**
 * The terms a plan is sold in, side by side: "3 oy -10%", the old price struck
 * through, the price, and what it works out to per month. The longer terms
 * are cheaper per month, and putting the three next to each other is what
 * lets that be seen at a glance.
 *
 * Used on the plan's card, where a tap goes on to payment, and in the payment
 * sheet, where it changes the choice.
 */
export const PlanPeriodPicker = memo(function PlanPeriodPicker({
  periods,
  value,
  onChange,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();

  return (
    <View accessibilityRole="radiogroup" style={styles.row}>
      {periods.map((period) => {
        const selected = value === period.months;
        const discount = getPriceDiscount(period);
        const label = t("subscription.periodMonths", { count: period.months });
        const price = formatLocalizedCurrency(period.price, locale);
        return (
          <Pressable
            key={period.months}
            accessibilityRole="radio"
            accessibilityLabel={`${label}, ${price}`}
            accessibilityState={{ selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(period.months)}
            style={({ pressed }) => [
              styles.tile,
              selected && styles.tileSelected,
              pressed && styles.pressed,
              disabled && styles.disabled,
            ]}
          >
            <View style={styles.tileTop}>
              <Text
                style={[styles.months, selected && styles.monthsSelected]}
                numberOfLines={1}
              >
                {label}
              </Text>
              {discount && discount.percent !== null ? (
                <DiscountBadge percent={discount.percent} />
              ) : null}
            </View>
            {/* The same slot in every tile, struck price or not, so the
                prices line up across the row. */}
            <View style={styles.oldPriceSlot}>
              {discount ? <OldPrice value={discount.oldPrice} /> : null}
            </View>
            <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit>
              {price}
            </Text>
            <Text style={styles.monthly} numberOfLines={1}>
              {period.months > 1
                ? t("subscription.perMonthApprox", {
                    price: formatLocalizedNumber(period.monthlyPrice, locale),
                  })
                : t("subscription.pricePerMonth")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: { flexDirection: "row", gap: spacing.xs },
    tile: {
      flex: 1,
      minWidth: 0,
      gap: 2,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    tileSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    tileTop: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
    },
    months: {
      ...typography.label,
      color: theme.text,
      fontWeight: "800",
    },
    monthsSelected: { color: theme.primary },
    oldPriceSlot: { minHeight: 16, justifyContent: "center" },
    price: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    monthly: {
      ...typography.caption,
      color: theme.textMuted,
    },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
