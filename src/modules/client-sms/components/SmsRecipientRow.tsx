import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import type { AppTheme } from "../../../types";
import type { SmsRecipient } from "../types";
import { isSmsRecipientSelectable } from "../utils/recipientSelection";
import {
  formatLocalizedCurrency,
  formatLocalizedDisplayedBalance,
  useTranslation,
} from "../../../i18n";

interface Props {
  recipient: SmsRecipient;
  selected: boolean;
  selectable: boolean;
  canSendOne: boolean;
  onQuotaReached?: () => void;
  onAddPhone?: (recipient: SmsRecipient) => void;
  onToggle: (id: number) => void;
  onSend: (recipient: SmsRecipient) => void;
}

export const SmsRecipientRow = memo(function SmsRecipientRow({
  recipient,
  selected,
  selectable,
  canSendOne,
  onQuotaReached,
  onAddPhone,
  onToggle,
  onSend,
}: Props) {
  const theme = useTheme();
  const { locale, t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const displayName = recipient.fullName.trim() || t("sms.clientFallback");
  const displayPhone = recipient.phone.trim();
  const hasPhone = Boolean(displayPhone);
  const canSend = isSmsRecipientSelectable(recipient);
  const initials =
    displayName
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || t("sms.clientFallback").slice(0, 1);
  return (
    <Pressable
      accessibilityRole={selectable && canSend ? "checkbox" : "button"}
      accessibilityState={{
        checked: selectable && canSend ? selected : undefined,
        disabled: selectable && !canSend && !onAddPhone,
      }}
      accessibilityLabel={`${displayName}, ${formatLocalizedDisplayedBalance(recipient.currentBalance, locale)}`}
      disabled={selectable && !canSend && !onAddPhone}
      onPress={() => {
        if (selectable && canSend) {
          onToggle(recipient.id);
          return;
        }
        if (!hasPhone) {
          onAddPhone?.(recipient);
          return;
        }
        if (!selectable && recipient.canSend) {
          if (canSendOne) onSend(recipient);
          else onQuotaReached?.();
        }
      }}
      style={({ pressed }) => [
        styles.card,
        selected && canSend && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      {selectable ? (
        <View
          style={[
            styles.check,
            !canSend && styles.checkDisabled,
            selected && canSend && styles.checkSelected,
          ]}
        >
          {selected && canSend ? (
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
            {displayName}
          </Text>
          {recipient.isBlacklisted ? (
            <View style={styles.blacklistBadge}>
              <Text style={styles.blacklistText}>{t("sms.blacklistBadge")}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} style={styles.phone}>
          {displayPhone || t("sms.recipientPhoneMissing")}
        </Text>
        {!hasPhone ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("sms.addRecipientPhone")}: ${displayName}`}
            hitSlop={6}
            onPress={(event) => {
              event.stopPropagation();
              onAddPhone?.(recipient);
            }}
            style={styles.phoneAction}
          >
            <Ionicons name="create-outline" size={13} color={theme.primary} />
            <Text style={styles.phoneActionText}>
              {t("sms.addRecipientPhone")}
            </Text>
          </Pressable>
        ) : !recipient.canSend ? (
          <Text numberOfLines={1} style={styles.reason}>
            {recipient.cannotSendReason || t("sms.cannotSend")}
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
          {formatLocalizedDisplayedBalance(recipient.currentBalance, locale)}
        </Text>
        {recipient.overdueBalance > 0 ? (
          <Text style={styles.overdue}>
            {t("sms.overdue", {
              amount: formatLocalizedCurrency(recipient.overdueBalance, locale),
            })}
          </Text>
        ) : null}
        {!selectable && canSend ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              canSendOne
                ? t("sms.sendToClient", { name: displayName })
                : t("sms.increaseLimit")
            }
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              if (canSendOne) onSend(recipient);
              else onQuotaReached?.();
            }}
            style={styles.sendButton}
          >
            <Ionicons
              name={canSendOne ? "paper-plane-outline" : "lock-closed-outline"}
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
    checkDisabled: {
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      opacity: 0.55,
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
    phoneAction: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      marginTop: 1,
      paddingVertical: 2,
    },
    phoneActionText: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: "700",
    },
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
