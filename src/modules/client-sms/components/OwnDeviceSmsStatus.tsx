import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { useSmsDevices } from "../hooks/useSmsDevices";
import { getOwnDeviceStatus } from "../utils/ownDeviceStatus";

interface Props {
  /** Opens the SMS settings, where the phone is connected and managed. */
  onPress: () => void;
}

/**
 * The SMS screen's status line when SMS go out from the shop's own phone. In
 * place of the package balance: those SMS cost nothing from a package, so
 * there is nothing to count down and nothing to buy. What matters instead is
 * whether the phone is there and how many more numbers it may text today.
 *
 * One line, the same size as the balance line it replaces.
 */
export const OwnDeviceSmsStatus = memo(function OwnDeviceSmsStatus({ onPress }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  // Live while the SMS tab is in front; a tab left open behind others does
  // not keep asking.
  const devices = useSmsDevices({ poll: useIsFocused() });
  const status = getOwnDeviceStatus(devices.data);

  // Until the phone's state has arrived, say only how SMS are sent: no count
  // and no warning that may turn out wrong a moment later.
  const known = devices.data !== undefined;
  const online = !known
    ? null
    : status.kind === "offline"
      ? false
      : status.kind === "notConnected"
        ? undefined
        : status.online;

  const message = !known
    ? t("sms.ownDeviceVia")
    : status.kind === "notConnected"
      ? t("sms.ownDeviceNotConnected")
      : status.kind === "blocked"
        ? status.reason || t("sms.ownDeviceBlocked")
        : status.kind === "offline"
          ? t("smsSettings.offlineQueues")
          : status.kind === "limitReached"
            ? t("sms.ownDeviceLimitReached")
            : status.remainingToday === null
              ? t("sms.ownDeviceVia")
              : t("sms.ownDeviceRemaining", { count: status.remainingToday });
  const tone = !known
    ? "normal"
    : status.kind === "limitReached"
      ? "danger"
      : status.kind === "ready"
        ? "normal"
        : "warning";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("smsSettings.deviceTitle")}. ${message}`}
      accessibilityHint={t("smsSettings.title")}
      onPress={onPress}
      style={({ pressed }) => [
        styles.banner,
        tone !== "normal" && styles.bannerAttention,
        pressed && styles.pressed,
      ]}
    >
      <View>
        <Ionicons name="phone-portrait-outline" size={18} color={theme.primary} />
        {/* Reachable, not, or not yet known: a dot on the phone, not a word. */}
        {online !== undefined ? (
          <View
            style={[
              styles.dot,
              {
                backgroundColor:
                  online === true ? theme.successColor : online === false ? theme.warningColor : theme.textMuted,
              },
            ]}
          />
        ) : null}
      </View>
      <Text
        style={[
          styles.text,
          tone === "warning" && { color: theme.warningColor },
          tone === "danger" && { color: theme.dangerColor },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>
      {status.kind === "notConnected" && known ? (
        <View style={styles.connect}>
          <Ionicons name="link-outline" size={14} color="#FFFFFF" />
          <Text style={styles.connectText}>{t("sms.ownDeviceConnect")}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      )}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    // The balance line's frame, so switching the source does not move the list.
    banner: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: 11,
      paddingVertical: 6,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    bannerAttention: { borderWidth: 1, borderColor: `${theme.warningColor}55` },
    dot: {
      position: "absolute",
      right: -2,
      bottom: 0,
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.primaryLight,
    },
    text: {
      flex: 1,
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    connect: {
      height: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingLeft: 8,
      paddingRight: 11,
      borderRadius: radius.full,
      backgroundColor: theme.primary,
    },
    connectText: {
      ...typography.caption,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
  });
