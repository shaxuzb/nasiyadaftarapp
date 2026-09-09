import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import type { AppTheme } from "../../../types";
import type { SmsRecipient } from "../types";
import { formatCurrency, formatDisplayedBalance } from "../../../utils";

interface Props {
  recipient: SmsRecipient;
  selected: boolean;
  selectable: boolean;
  canSendOne: boolean;
  onToggle: (id: number) => void;
  onSend: (recipient: SmsRecipient) => void;
}

export const SmsRecipientRow = memo(function SmsRecipientRow({
  recipient,
  selected,
  selectable,
  canSendOne,
  onToggle,
  onSend,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const initials =
    recipient.fullName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "M";
  return (
    <Pressable
      accessibilityRole={selectable ? "checkbox" : "button"}
      accessibilityState={{
        checked: selectable ? selected : undefined,
        disabled: selectable && !recipient.canSend,
      }}
      accessibilityLabel={`${recipient.fullName}, ${formatDisplayedBalance(recipient.currentBalance)}`}
      disabled={selectable && !recipient.canSend}
      onPress={() =>
        selectable
          ? onToggle(recipient.id)
          : recipient.canSend && canSendOne && onSend(recipient)
      }
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {selectable ? (
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? (
            <Ionicons name="checkmark" size={15} color="#fff" />
          ) : null}
        </View>
      ) : null}
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.name}>
            {recipient.fullName}
          </Text>
          {recipient.isBlacklisted ? (
            <View style={styles.blacklistBadge}>
              <Text style={styles.blacklistText}>Qora ro'yxat</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.phone}>
          {recipient.phone || "Telefon mavjud emas"}
        </Text>
        {!recipient.canSend ? (
          <Text numberOfLines={1} style={styles.reason}>
            {recipient.cannotSendReason || "SMS yuborib bo'lmaydi"}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        <Text
          style={[
            styles.balance,
            {
              color:
                recipient.currentBalance > 0
                  ? theme.debtColor
                  : theme.paymentColor,
            },
          ]}
        >
          {formatDisplayedBalance(recipient.currentBalance)}
        </Text>
        {recipient.overdueBalance > 0 ? (
          <Text style={styles.overdue}>
            Kechikkan: {formatCurrency(recipient.overdueBalance)}
          </Text>
        ) : null}
        {!selectable && canSendOne && recipient.canSend ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${recipient.fullName}ga SMS yuborish`}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onSend(recipient);
            }}
            style={styles.sendButton}
          >
            <Ionicons
              name="paper-plane-outline"
              size={18}
              color={theme.primary}
            />
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 11,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
    },
    selected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    pressed: { opacity: 0.7 },
    check: {
      width: 22,
      height: 22,
      borderRadius: 7,
      borderWidth: 1.5,
      borderColor: theme.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: theme.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: { color: theme.primary, fontWeight: "800", fontSize: 15 },
    copy: { minWidth: 0, flex: 1, gap: 2 },
    titleLine: { flexDirection: "row", alignItems: "center", gap: 5 },
    name: {
      minWidth: 0,
      flexShrink: 1,
      color: theme.text,
      fontSize: 14,
      fontWeight: "700",
    },
    phone: { color: theme.textSecondary, fontSize: 12 },
    reason: { color: theme.warningColor, fontSize: 10 },
    blacklistBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: theme.debtBg,
    },
    blacklistText: { color: theme.dangerColor, fontSize: 9, fontWeight: "700" },
    trailing: { maxWidth: "37%", alignItems: "flex-end", gap: 2 },
    balance: { fontSize: 12, fontWeight: "800" },
    overdue: { color: theme.warningColor, fontSize: 9 },
    sendButton: {
      width: 34,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: theme.primaryLight,
    },
  });
