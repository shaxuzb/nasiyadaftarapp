import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { typography, spacing, radius } from "../../../theme";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { navigateToPushNotification } from "../../../navigation/navigationRef";

export function PushInAppBanner() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { foregroundMessage, dismissForegroundMessage } =
    usePushNotifications();
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    if (!foregroundMessage) return;
    translateY.setValue(-24);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [foregroundMessage, opacity, translateY]);

  if (!foregroundMessage) return null;

  const open = () => {
    const notificationId = foregroundMessage.notificationId;
    dismissForegroundMessage();
    navigateToPushNotification(notificationId);
  };

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[
        styles.wrapper,
        { top: insets.top + spacing.sm, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("notifications.openA11y")}
        onPress={open}
        style={styles.banner}
      >
        <View style={styles.icon}>
          <Ionicons name="notifications" size={20} color={theme.primary} />
        </View>
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>
            {foregroundMessage.title || t("notifications.screenTitle")}
          </Text>
          {foregroundMessage.body ? (
            <Text numberOfLines={2} style={styles.body}>
              {foregroundMessage.body}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("notifications.close")}
          hitSlop={10}
          onPress={dismissForegroundMessage}
          style={styles.close}
        >
          <Ionicons name="close" size={18} color={theme.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrapper: {
      position: "absolute",
      left: spacing.md,
      right: spacing.md,
      zIndex: 100,
    },
    banner: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: radius.lg,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
      boxShadow: theme.cardShadow,
    },
    icon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    copy: { flex: 1, gap: 2 },
    title: { ...typography.label, color: theme.text },
    body: { ...typography.caption, color: theme.textSecondary },
    close: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
    },
  });
