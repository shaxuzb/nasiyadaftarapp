import React, { memo, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import type { AppTheme } from "../../../types";
import type { SmsRecipient } from "../types";
import { BlacklistBadge } from "../../clients/components/BlacklistBadge";
import { isCustomerBlacklisted } from "../../clients/utils/blacklist";
import { isSmsRecipientSelectable } from "../utils/recipientSelection";
import { SmsStatusBadge } from "./SmsStatusBadge";
import { formatSmsShortDate } from "../utils/smsStatusPresentation";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
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
  /** This row's own send is in flight. */
  sending: boolean;
  /** Some send is in flight, this row's or a bulk one; sends go one at a time. */
  sendDisabled: boolean;
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
  sending,
  sendDisabled,
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
            <Ionicons name="checkmark" size={12} color="#fff" />
          ) : null}
        </View>
      ) : null}
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text numberOfLines={3} style={styles.name}>
            {displayName}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.phone}>
          {displayPhone || t("sms.recipientPhoneMissing")}
        </Text>
        {recipient.lastSmsStatus ? (
          <View style={styles.lastSmsLine}>
            <SmsStatusBadge status={recipient.lastSmsStatus} />
            {recipient.lastSmsAt ? (
              <Text numberOfLines={1} style={styles.lastSmsDate}>
                {formatSmsShortDate(recipient.lastSmsAt)}
              </Text>
            ) : null}
          </View>
        ) : null}
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
        ) : recipient.nextSmsAvailableDate ? (
          <Text numberOfLines={1} style={styles.reason}>
            {t("sms.nextAvailable", {
              date: formatLocalizedDate(recipient.nextSmsAvailableDate, locale),
            })}
          </Text>
        ) : recipient.smsSentToday && !recipient.lastSmsStatus ? (
          <View style={styles.sentTodayLine}>
            <Ionicons name="time-outline" size={12} color={theme.textMuted} />
            <Text numberOfLines={1} style={styles.sentTodayText}>
              {t("sms.smsToday")}
            </Text>
          </View>
        ) : !recipient.canSend && !recipient.lastSmsStatus ? (
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
            accessibilityState={{ disabled: sendDisabled, busy: sending }}
            disabled={sendDisabled}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              if (canSendOne) onSend(recipient);
              else onQuotaReached?.();
            }}
            style={[
              styles.sendButton,
              sendDisabled && !sending && styles.sendButtonDimmed,
            ]}
          >
            {sending ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name={canSendOne ? "paper-plane-outline" : "lock-closed-outline"}
                size={18}
                color={theme.primary}
              />
            )}
          </Pressable>
        ) : null}
      </View>
      {/* Pinned to the card's top-right corner, exactly as on a customer card:
          it takes nothing from the name, and looks the same on both lists.
          Blacklisted here or in any other organization: the count alone is
          enough. */}
      {isCustomerBlacklisted(recipient) ? (
        <BlacklistBadge
          style={styles.blacklistCorner}
          customerId={recipient.id}
          customerName={displayName}
        />
      ) : null}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      padding: 11,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
    },
    // Same place as on a customer card. -5 is covered by the list's top
    // padding, so the first row's badge is not clipped.
    blacklistCorner: { position: "absolute", top: -5, right: 12 },
    selected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    pressed: { opacity: 0.7 },
    check: {
      width: 14,
      height: 14,
      borderRadius: 2,
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
    lastSmsLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 2 },
    lastSmsDate: { color: theme.textMuted, fontSize: 10 },
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
    sentTodayLine: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 3,
      marginTop: 1,
    },
    sentTodayText: { color: theme.textMuted, fontSize: 10, fontWeight: "700" },
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
    sendButtonDimmed: { opacity: 0.45 },
  });
