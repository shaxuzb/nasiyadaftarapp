import React, { memo, useMemo } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
  View,
} from "react-native";

import { useTheme } from "../../../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedNumber,
  useTranslation,
} from "../../../i18n";
import { radius } from "../../../theme";
import type { AppTheme } from "../../../types";
import {
  formatDiscountPercent,
  getPriceDiscount,
  type DiscountablePrice,
} from "../utils/discount";

/**
 * The price before the discount, struck through. It is quieter than the
 * current price beside it, so the eye lands on what is actually charged.
 */
export const OldPrice = memo(function OldPrice({
  value,
  withCurrency = false,
  style,
}: {
  value: number;
  /** On a line of its own it needs the currency; beside the price it does not. */
  withCurrency?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  const { locale, t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Text
      // A screen reader does not announce a strike-through, so say it.
      accessibilityLabel={t("subscription.oldPriceA11y", {
        price: formatLocalizedCurrency(value, locale),
      })}
      numberOfLines={1}
      style={[styles.oldPrice, style]}
    >
      {withCurrency
        ? formatLocalizedCurrency(value, locale)
        : formatLocalizedNumber(value, locale)}
    </Text>
  );
});

/** The "-20%" pill. Green, the app's colour for money in the user's favour. */
export const DiscountBadge = memo(function DiscountBadge({
  percent,
  style,
}: {
  percent: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const label = formatDiscountPercent(percent);

  return (
    <View
      accessible
      accessibilityLabel={t("subscription.discountA11y", {
        percent: label.slice(1),
      })}
      style={[styles.badge, style]}
    >
      <Text style={styles.badgeText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
});

/**
 * For a price that stands on a line of its own (a plan card, the checkout):
 * the old price and the badge, to go just above it. Renders nothing when the
 * product is not discounted, so the layout is exactly what it was.
 */
export const DiscountSummary = memo(function DiscountSummary({
  product,
  withCurrency = false,
  style,
}: {
  product: DiscountablePrice;
  /** Leave off where the price just below already names the currency. */
  withCurrency?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const discount = getPriceDiscount(product);
  if (!discount) return null;

  return (
    <View style={[layout.row, style]}>
      <OldPrice value={discount.oldPrice} withCurrency={withCurrency} />
      {discount.percent !== null ? (
        <DiscountBadge percent={discount.percent} />
      ) : null}
    </View>
  );
});

/**
 * For a price inside a line of text: "49 900  39 900 so'm  -20%". Without a
 * discount it is the price alone, styled as the caller's own text was.
 */
export const DiscountedPriceLine = memo(function DiscountedPriceLine({
  product,
  priceLabel,
  priceStyle,
  style,
}: {
  product: DiscountablePrice;
  /** The current price, already formatted the way that screen shows it. */
  priceLabel: string;
  priceStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const discount = getPriceDiscount(product);

  return (
    <View style={[layout.row, style]}>
      {discount ? <OldPrice value={discount.oldPrice} /> : null}
      <Text style={priceStyle} numberOfLines={1}>
        {priceLabel}
      </Text>
      {discount && discount.percent !== null ? (
        <DiscountBadge percent={discount.percent} />
      ) : null}
    </View>
  );
});

// Wraps instead of squeezing: on a narrow card the badge drops to the next
// line rather than cutting the price.
const layout = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 6,
    rowGap: 2,
  },
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    oldPrice: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
      textDecorationLine: "line-through",
    },
    badge: {
      flexShrink: 0,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: theme.paymentBg,
    },
    badgeText: {
      color: theme.paymentColor,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
  });
