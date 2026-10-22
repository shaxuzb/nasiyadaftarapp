import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import type { AppTheme } from "../../../types";
import { formatLocalizedDate, useTranslation } from "../../../i18n";
import type { SmsHistoryItem } from "../types";
import { SmsStatusBadge } from "./SmsStatusBadge";
import { getSmsStatusAppearance } from "../utils/smsStatusPresentation";

export const SmsHistoryRow = memo(function SmsHistoryRow({
  item,
}: {
  item: SmsHistoryItem;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const displayName = item.fullName.trim() || t("sms.clientFallback");
  const appearance = getSmsStatusAppearance(item.normalizedStatus, theme);
  const statusColor = appearance?.color ?? theme.textMuted;
  const statusBackground = appearance?.background ?? theme.inputBackground;
  const statusIcon = appearance?.icon ?? "help-circle-outline";
  const failed = item.normalizedStatus === "failed" || item.normalizedStatus === "error";
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: statusBackground }]}>
        <Ionicons name={statusIcon} size={18} color={statusColor} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={3} style={styles.name}>
          {displayName}
        </Text>
        <Text numberOfLines={1} style={styles.phone}>
          {item.phone || t("sms.recipientPhoneMissing")}
        </Text>
        {item.normalizedStatus === "queued" ? <Text style={styles.detail}>{t("sms.queueDetail", { position: item.queuePosition ?? "—", date: item.estimatedSendDate ? formatLocalizedDate(item.estimatedSendDate, locale) : "—" })}</Text> : null}
        {item.source === "auto" ? <Text style={styles.detail}>{t("sms.sourceAuto")}</Text> : null}
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
        <SmsStatusBadge status={item.normalizedStatus} />
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
    date: { color: theme.textMuted, fontSize: 10 },
  });
