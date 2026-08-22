import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Transaction } from "../modules/transactions/types";
import { formatCurrency, formatDate } from "../utils";
import { useTheme } from "../hooks/useTheme";
import { AppTheme } from "../types";

interface Props {
  transaction: Transaction;
  isLast?: boolean;
  onPress?: () => void;
}

export function TransactionItem({
  transaction,
  isLast = false,
  onPress,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const isDebt = transaction.type === "debt";
  const color = isDebt ? theme.debtColor : theme.paymentColor;
  const backgroundColor = isDebt ? theme.debtBg : theme.paymentBg;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={
        onPress
          ? `${isDebt ? "Qarz" : "To'lov"}, ${formatCurrency(transaction.amount)}`
          : undefined
      }
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && onPress && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor }]}>
        <Ionicons
          name={isDebt ? "arrow-down" : "arrow-up"}
          size={16}
          color={color}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {isDebt ? "Qarz berildi" : "To'lov qabul qilindi"}
        </Text>
        <Text style={styles.note} numberOfLines={1}>
          {transaction.note || (isDebt ? "Nasiya berildi" : "To'lov olindi")}
        </Text>
      </View>

      <View style={styles.amountBlock}>
        <Text
          selectable
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.amount, { color }]}
        >
          {isDebt ? "−" : "+"} {formatCurrency(transaction.amount)}
        </Text>
        <Text selectable style={styles.date}>
          {formatDate(transaction.date)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    row: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 12,
      paddingVertical: 5,
      backgroundColor: theme.surface,
    },
    debtRow: {
      backgroundColor: theme.debtBg,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    icon: {
      width: 30,
      height: 30,
      flexShrink: 0,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    content: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    title: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    note: {
      color: theme.textSecondary,
      fontSize: 10,
      lineHeight: 14,
    },
    amountBlock: {
      maxWidth: 110,
      alignItems: "flex-end",
      gap: 2,
    },
    amount: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    date: {
      color: theme.textSecondary,
      fontSize: 9,
      lineHeight: 13,
      fontVariant: ["tabular-nums"],
    },
    pressed: {
      backgroundColor: theme.inputBackground,
    },
  });
