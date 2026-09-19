import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../i18n";
import { usePushNotifications } from "../modules/push/hooks/usePushNotifications";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function NotificationSettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    permission,
    isEnabled,
    isRegistering,
    lastError,
    retryRegistration,
    refreshPermission,
    setNotificationsEnabled,
    openSystemSettings,
  } = usePushNotifications();

  const openSettings = async () => {
    try {
      await openSystemSettings();
    } catch {
      showToast(t("notifications.permissionError"), "error");
    }
  };

  // const permissionLabel =
  //   permission === "denied"
  //     ? t("notifications.permissionDenied")
  //     : !isEnabled
  //       ? t("notifications.permissionDisabled")
  //       : permission === "granted"
  //         ? t("notifications.permissionGranted")
  //         : t("notifications.permissionUndetermined");
  // const isGranted = permission === "granted";
  // const isActive = isEnabled && isGranted;

  const toggleNotifications = async (nextValue: boolean) => {
    if (nextValue && permission === "denied") {
      await openSettings();
      return;
    }

    const updated = await setNotificationsEnabled(nextValue);
    if (updated) return;

    const currentPermission = await refreshPermission();
    if (nextValue && currentPermission === "denied") {
      await openSettings();
      return;
    }
    showToast(t("notifications.permissionError"), "error");
  };

  const retry = async () => {
    const registered = await retryRegistration();
    if (!registered) showToast(t("notifications.permissionError"), "error");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t("notifications.permissionTitle")}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        {/* <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons
              name={isActive ? "notifications" : "notifications-outline"}
              size={28}
              color={theme.primary}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>
              {t("notifications.permissionTitle")}
            </Text>
            <Text style={styles.heroDescription}>{permissionLabel}</Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? theme.successColor : theme.warningColor },
            ]}
          />
        </View>

        <View style={styles.infoCard}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={theme.primary}
          />
          <Text style={styles.infoText}>
            {isActive
              ? t("notifications.emptyDescription")
              : permission === "denied"
                ? t("notifications.permissionDenied")
                : t("notifications.permissionDisabled")}
          </Text>
        </View> */}

        <View style={styles.toggleCard}>
          <View style={styles.toggleIcon}>
            <Ionicons
              name={isEnabled ? "notifications" : "notifications-off-outline"}
              size={22}
              color={isEnabled ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>
              {t("notifications.permissionTitle")}
            </Text>
            <Text style={styles.toggleDescription}>
              {t("notifications.toggleDescription")}
            </Text>
          </View>
          <Switch
            value={isEnabled}
            onValueChange={(value) => void toggleNotifications(value)}
            disabled={isRegistering}
            trackColor={{ false: theme.border, true: theme.primaryLight }}
            thumbColor={isEnabled ? theme.primary : theme.textMuted}
            ios_backgroundColor={theme.border}
            accessibilityRole="switch"
            accessibilityLabel={t("notifications.permissionTitle")}
            accessibilityState={{ checked: isEnabled, disabled: isRegistering }}
          />
        </View>

        {permission === "denied" ? (
          <PrimaryButton
            label={t("notifications.openSettings")}
            loading={isRegistering}
            onPress={() => void openSettings()}
          />
        ) : null}

        {permission === "denied" ? (
          <PrimaryButton
            label={t("notifications.retry")}
            variant="outline"
            loading={isRegistering}
            onPress={() => void retry()}
          />
        ) : null}

        {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
        {isRegistering ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      ...typography.headingLarge,
      color: theme.text,
    },
    content: { padding: spacing.md, gap: spacing.md },
    hero: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroIcon: {
      width: 52,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: theme.primaryLight,
    },
    heroCopy: { flex: 1, gap: 3 },
    heroTitle: { ...typography.headingSmall, color: theme.text },
    heroDescription: { ...typography.bodySmall, color: theme.textSecondary },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    infoText: { flex: 1, ...typography.bodySmall, color: theme.textSecondary },
    toggleCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    toggleIcon: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    toggleCopy: { flex: 1, gap: 3 },
    toggleTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "800",
    },
    toggleDescription: { ...typography.caption, color: theme.textSecondary },
    error: { ...typography.caption, color: theme.dangerColor },
    loader: { marginTop: spacing.xs },
  });
