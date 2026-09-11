import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import type { AppTheme } from "../../../types";
import { formatLocalizedDate, useTranslation } from "../../../i18n";
import type { SmsHistoryItem } from "../types";

export const SmsHistoryRow = memo(function SmsHistoryRow({
  item,
}: {
  item: SmsHistoryItem;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const displayName = item.fullName.trim() || t("sms.clientFallback");
  const sent =
    item.normalizedStatus === "sent" || item.normalizedStatus === "success";
  const failed =
    item.normalizedStatus === "failed" || item.normalizedStatus === "error";
  const color = sent
    ? theme.paymentColor
    : failed
      ? theme.dangerColor
      : theme.warningColor;
  const label = sent
    ? t("sms.statusSent")
    : failed
      ? t("sms.statusFailed")
      : item.normalizedStatus === "skipped"
        ? t("sms.statusSkipped")
        : item.status || t("common.unexpectedError");
  return (
    <View style={styles.card}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: sent
              ? theme.paymentBg
              : failed
                ? theme.debtBg
                : theme.inputBackground,
          },
        ]}
      >
        <Ionicons
          name={sent ? "checkmark" : failed ? "close" : "remove"}
          size={18}
          color={color}
        />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>
          {displayName}
        </Text>
        <Text numberOfLines={1} style={styles.phone}>
          {item.phone || t("sms.recipientPhoneMissing")}
        </Text>
        {item.errorMessage || item.message ? (
          <Text
            numberOfLines={2}
            style={[styles.detail, failed && { color: theme.dangerColor }]}
          >
            {item.errorMessage || item.message}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: sent
                ? theme.paymentBg
                : failed
                  ? theme.debtBg
                  : theme.inputBackground,
            },
          ]}
        >
          <Text style={[styles.status, { color }]}>{label}</Text>
        </View>
        {item.sentAt ? (
          <Text style={styles.date}>{formatLocalizedDate(item.sentAt, locale)}</Text>
        ) : null}
      </View>
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      backgroundColor: theme.surface,
    },
    icon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    name: { color: theme.text, fontSize: 14, fontWeight: "700" },
    phone: { color: theme.textSecondary, fontSize: 12 },
    detail: { color: theme.textMuted, fontSize: 11, lineHeight: 15 },
    trailing: { alignItems: "flex-end", gap: 5 },
    badge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999 },
    status: { fontSize: 10, fontWeight: "800" },
    date: { color: theme.textMuted, fontSize: 10 },
  });
