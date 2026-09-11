import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppTheme, Customer } from "../types";
import { formatDisplayedBalance, getFullName, getInitials } from "../utils";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../i18n";

interface Props {
  customer: Customer;
  balance: number;
  onPress: () => void;
}

export const CustomerCard = memo(function CustomerCard({
  customer,
  balance,
  onPress,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${getFullName(customer)}, ${formatDisplayedBalance(balance)}`}
      accessibilityHint={t("common.openTransactionSheet")}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{getInitials(customer)}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {getFullName(customer)}
        </Text>
        <Text style={styles.phone} numberOfLines={1}>
          {customer.phone}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[
          styles.balance,
          { color: balance > 0 ? theme.debtColor : theme.paymentColor },
        ]}
      >
        {formatDisplayedBalance(balance)}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      minHeight: 68,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.surface,
      borderRadius: 14,
      borderCurve: "continuous",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    initials: { fontSize: 16, fontWeight: "800", color: theme.primary },
    info: { flex: 1, minWidth: 0, gap: 2 },
    name: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "700",
    },
    phone: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontVariant: ["tabular-nums"],
    },
    balance: {
      maxWidth: "38%",
      color: theme.debtColor,
      fontSize: 14,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    pressed: { opacity: 0.7 },
  });
