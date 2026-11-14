import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { normalizeNetworkStatus, setCurrentNetworkStatus } from "../../../core/network/networkState";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { useDismissOnAppLock } from "../../pin-auth/hooks/useDismissOnAppLock";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import {
  hideConnectionNotice,
  remainingProblem,
  showConnectionNotice,
  useConnectionNotice,
  type ConnectionProblem,
} from "../state/connectionNotice";
import { isServerDown, reportServerUp } from "../state/serverStatus";
import { checkServerHealth } from "../sync/healthService";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ENTER_MS = 260;
const EXIT_MS = 180;

/**
 * Says, in plain words, why something did not go through, and what to do.
 *
 * - No internet: what to check on the phone (mobile data or Wi‑Fi, airplane
 *   mode). Nothing is written without it.
 * - Server down (internet fine): the section opens once the server is back;
 *   meanwhile customers, debts and payments go on in offline mode and are
 *   sent by themselves.
 *
 * A panel rising from the bottom, where the thumb is. "Qayta tekshirish"
 * asks again; if the way is clear, what the user tried happens.
 */
export function ConnectionNoticeModal() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const notice = useConnectionNotice();
  const [checking, setChecking] = useState(false);
  const [stillDown, setStillDown] = useState(false);
  // Kept on screen while it slides away, after the notice itself has gone.
  const [shown, setShown] = useState<{ problem: ConnectionProblem } | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setChecking(false);
    setStillDown(false);
    if (notice) {
      setShown({ problem: notice.problem });
      Animated.timing(progress, {
        toValue: 1,
        duration: ENTER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: EXIT_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setShown(null);
      });
    }
  }, [notice, progress]);

  useDismissOnAppLock(hideConnectionNotice);

  const recheck = useCallback(async () => {
    if (!notice || checking) return;
    setChecking(true);
    setStillDown(false);
    try {
      const state = await NetInfo.refresh();
      setCurrentNetworkStatus(normalizeNetworkStatus(state.isConnected, state.isInternetReachable));
      if (notice.needs === "server" && isServerDown() && (await checkServerHealth())) reportServerUp();
    } finally {
      setChecking(false);
    }
    const problem = remainingProblem(notice.needs);
    if (!problem) {
      const retry = notice.retry;
      hideConnectionNotice();
      retry?.();
      return;
    }
    if (problem !== notice.problem) showConnectionNotice(problem, notice.retry, notice.needs);
    else setStillDown(true);
  }, [checking, notice]);

  if (!shown) return null;

  const serverDown = shown.problem === "serverDown";
  const accent = serverDown ? theme.warningColor : theme.dangerColor;
  const tips: { icon: IconName; text: string; done?: boolean }[] = serverDown
    ? [
        { icon: "person-add-outline", text: t("offline.connection.canAddCustomer"), done: true },
        { icon: "swap-vertical-outline", text: t("offline.connection.canRecord"), done: true },
        { icon: "cloud-upload-outline", text: t("offline.connection.autoSend") },
      ]
    : [
        { icon: "cellular-outline", text: t("offline.connection.tipConnection") },
        { icon: "airplane-outline", text: t("offline.connection.tipAirplane") },
      ];

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={hideConnectionNotice}
    >
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={hideConnectionNotice} accessibilityLabel={t("common.close")} />
      </Animated.View>

      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs },
            {
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.handle} />

          {/* The sign, in its colour: what happened, before a word is read. */}
          <View style={[styles.iconTile, { backgroundColor: `${accent}18` }]}>
            <Ionicons name={serverDown ? "cloud-offline" : "wifi"} size={38} color={accent} />
            {serverDown ? null : (
              <View style={[styles.slash, { backgroundColor: accent, borderColor: theme.surface }]} />
            )}
          </View>

          <Text style={styles.title} accessibilityRole="header">
            {serverDown ? t("offline.connection.serverDownTitle") : t("offline.connection.noInternetTitle")}
          </Text>
          <Text style={styles.body}>
            {serverDown ? t("offline.connection.serverDownBody") : t("offline.connection.noInternetBody")}
          </Text>

          {/* What to do: check the phone, or carry on offline. */}
          <View style={[styles.card, serverDown && styles.cardOffline]}>
            {serverDown ? <Text style={styles.cardTitle}>{t("offline.connection.offlineTitle")}</Text> : null}
            {tips.map((tip) => (
              <View key={tip.text} style={styles.tip}>
                <View
                  style={[
                    styles.tipIcon,
                    { backgroundColor: tip.done ? theme.successColor : `${serverDown ? theme.successColor : accent}1F` },
                  ]}
                >
                  <Ionicons
                    name={tip.done ? "checkmark" : tip.icon}
                    size={tip.done ? 15 : 16}
                    color={tip.done ? "#FFFFFF" : serverDown ? theme.successColor : accent}
                  />
                </View>
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {stillDown ? (
            <View style={[styles.stillDown, { backgroundColor: `${accent}14` }]} accessibilityLiveRegion="polite">
              <Ionicons name="information-circle" size={16} color={accent} />
              <Text style={[styles.stillDownText, { color: accent }]}>
                {serverDown ? t("offline.connection.stillServerDown") : t("offline.connection.stillNoInternet")}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: checking, disabled: checking }}
            disabled={checking}
            onPress={() => void recheck()}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed, checking && styles.busy]}
          >
            {checking ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.primaryText}>
              {checking ? t("offline.connection.checking") : t("offline.connection.retry")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={hideConnectionNotice}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{t("offline.connection.ok")}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(8, 15, 30, 0.5)",
    },
    anchor: { flex: 1, justifyContent: "flex-end", alignItems: "center" },
    sheet: {
      width: "100%",
      // A centred panel on a tablet, not the window's whole width.
      maxWidth: 560,
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.12,
      shadowRadius: 18,
      elevation: 16,
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      marginBottom: spacing.lg,
      backgroundColor: theme.border,
    },
    iconTile: {
      width: 80,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 26,
      borderCurve: "continuous",
      marginBottom: spacing.md,
    },
    // The Wi‑Fi crossed out: no internet.
    slash: {
      position: "absolute",
      width: 4.5,
      height: 50,
      borderRadius: 3,
      borderWidth: 1.5,
      transform: [{ rotate: "-45deg" }],
    },
    title: {
      ...typography.headingMedium,
      fontSize: 21,
      lineHeight: 27,
      fontWeight: "800",
      color: theme.text,
      textAlign: "center",
    },
    body: {
      ...typography.bodySmall,
      marginTop: 6,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 420,
    },
    card: {
      alignSelf: "stretch",
      gap: 10,
      marginTop: spacing.lg,
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.inputBackground,
    },
    cardOffline: { backgroundColor: `${theme.successColor}12` },
    cardTitle: { ...typography.bodyMedium, color: theme.text, fontWeight: "800", marginBottom: 2 },
    tip: { flexDirection: "row", alignItems: "center", gap: 12 },
    tipIcon: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
    },
    tipText: { flex: 1, ...typography.bodySmall, color: theme.text, lineHeight: 19 },
    stillDown: {
      alignSelf: "stretch",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 9,
      borderRadius: radius.md,
    },
    stillDownText: { flex: 1, ...typography.caption, fontWeight: "700" },
    primary: {
      alignSelf: "stretch",
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: spacing.lg,
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: theme.primary,
    },
    primaryText: { ...typography.label, color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
    busy: { opacity: 0.8 },
    secondary: {
      alignSelf: "stretch",
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      borderRadius: 16,
    },
    secondaryText: { ...typography.label, color: theme.textSecondary, fontWeight: "700", fontSize: 15 },
    pressed: { opacity: 0.75 },
  });
