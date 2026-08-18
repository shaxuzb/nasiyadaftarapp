import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme, Customer } from "../types";
import { formatCurrency, getFullName, getInitials } from "../utils";
import { useTheme } from "../hooks/useTheme";

interface Props {
  customer: Customer;
  balance: number;
  lastTxDaysAgo?: number;
  onPress: () => void;
  onAddDebt: () => void;
  onAddPayment: () => void;
}

function CustomerCardInner({
  customer,
  balance,
  onPress,
  onAddDebt,
  onAddPayment,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const settled = balance <= 0;
  const avatarColor = useMemo(() => {
    const avatarPalette = [
      { background: theme.paymentBg, foreground: theme.paymentColor },
      { background: theme.debtBg, foreground: theme.debtColor },
      { background: theme.inputBackground, foreground: theme.secondary },
      { background: theme.primaryLight, foreground: theme.primary },
    ];
    return avatarPalette[Math.abs(Number(customer.id)) % avatarPalette.length];
  }, [customer.id, theme]);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${getFullName(customer)} tafsilotlari`}
        onPress={onPress}
        style={({ pressed }) => [styles.topPress, pressed && styles.pressed]}
      >
        <View
          style={[styles.avatar, { backgroundColor: avatarColor.background }]}
        >
          <Text style={[styles.avatarText, { color: avatarColor.foreground }]}>
            {getInitials(customer)}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {getFullName(customer)}
          </Text>
          <Text selectable style={styles.meta} numberOfLines={1}>
            {customer.phone}
          </Text>
        </View>

        <View style={styles.balanceColumn}>
          <Text
            selectable
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.78}
            style={[
              styles.balance,
              { color: settled ? theme.paymentColor : theme.debtColor },
            ]}
          >
            {formatCurrency(Math.max(balance, 0))}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color={theme.textMuted}
          style={styles.chevron}
        />
      </Pressable>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          onPress={onAddDebt}
          style={({ pressed }) => [
            styles.actionButton,
            styles.debtButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="add-circle-outline" size={23} color={theme.primary} />
          <Text style={[styles.actionText, styles.debtButtonText]}>
            Qarz qo'shish
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onAddPayment}
          style={({ pressed }) => [
            styles.actionButton,
            styles.paymentButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons
            name="wallet-outline"
            size={22}
            color={theme.paymentColor}
          />
          <Text style={[styles.actionText, styles.paymentButtonText]}>
            To'lov olish
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

export const CustomerCard = memo(
  CustomerCardInner,
  (prev, next) =>
    prev.balance === next.balance &&
    prev.lastTxDaysAgo === next.lastTxDaysAgo &&
    prev.customer.id === next.customer.id &&
    prev.customer.firstName === next.customer.firstName &&
    prev.customer.lastName === next.customer.lastName &&
    prev.customer.phone === next.customer.phone &&
    prev.customer.note === next.customer.note,
);

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
      borderCurve: "continuous",
      padding: 10,
      gap: 13,
      boxShadow: theme.cardShadow,
    },
    topPress: {
      minHeight: 52,
      position: "relative",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    pressed: {
      opacity: 0.72,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 14,
      lineHeight: 26,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    info: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    name: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    meta: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "400",
      fontVariant: ["tabular-nums"],
    },
    balanceColumn: {
      maxWidth: 116,
      marginRight: 18,
      alignItems: "flex-end",
      gap: 6,
    },
    chevron: {
      position: "absolute",
      right: -4,
    },
    statusChip: {
      minHeight: 29,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    settledChip: {
      backgroundColor: theme.paymentBg,
      borderColor: theme.paymentColor,
    },
    debtChip: {
      backgroundColor: theme.debtBg,
      borderColor: theme.debtColor,
    },
    statusText: {
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    balance: {
      fontSize: 14,
      lineHeight: 23,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    actionsRow: {
      flexDirection: "row",
      gap: 10,
    },
    actionButton: {
      minHeight: 38,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1.25,
      borderRadius: 13,
      borderCurve: "continuous",
      paddingHorizontal: 8,
    },
    debtButton: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    paymentButton: {
      backgroundColor: theme.paymentBg,
      borderColor: theme.paymentColor,
    },
    actionText: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "700",
    },
    debtButtonText: {
      color: theme.primary,
    },
    paymentButtonText: {
      color: theme.paymentColor,
    },
  });
