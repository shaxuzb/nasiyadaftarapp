import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useAuth } from "../../../context/AuthContext";
import { useRegionalProductCapabilities } from "../../../hooks/useRegionalProductCapabilities";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import type { AppTheme, RootStackParamList } from "../../../types";
import {
  getSubscriptionPeriod,
  isRenewalReminderDismissed,
  parseRenewalReminderDismissal,
  toLocalDayKey,
} from "../utils/subscriptionPeriod";

const STORAGE_KEY = "renewal_reminder_dismissed_v1";

/**
 * A thin strip on the home screen in the last days of a paid plan: "your plan
 * ends in 3 days". Tapping it opens the plans; the cross puts it away for the
 * rest of the day.
 *
 * Kept out of the way on purpose: one line, no sound, no dialog. It reads the
 * subscription the app already holds, so it costs no request of its own, and
 * reads the "closed today" note once, when the screen opens.
 */
export function RenewalReminderBanner() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const regionalCapabilities = useRegionalProductCapabilities();
  const subscription = user?.subscription;
  const isAdministrator = user?.role === "Administrator" && user?.roleId === 2;

  const period = useMemo(() => getSubscriptionPeriod(subscription), [subscription]);
  // Undefined until the note has been read, so the strip never flashes up and
  // then disappears.
  const [dismissed, setDismissed] = useState<boolean | undefined>(undefined);

  const dismissalKey = useMemo(
    () =>
      user && subscription?.endAt
        ? { userId: user.id, endAt: subscription.endAt, day: toLocalDayKey() }
        : null,
    [subscription?.endAt, user],
  );

  const relevant =
    period.endingSoon &&
    dismissalKey !== null &&
    regionalCapabilities.subscriptionVisible &&
    !isAdministrator;

  useEffect(() => {
    if (!relevant || !dismissalKey) return undefined;
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (active) {
          setDismissed(
            isRenewalReminderDismissed(parseRenewalReminderDismissal(raw), dismissalKey),
          );
        }
      })
      .catch(() => {
        if (active) setDismissed(false);
      });
    return () => {
      active = false;
    };
  }, [dismissalKey, relevant]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (dismissalKey) {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dismissalKey)).catch(
        () => undefined,
      );
    }
  }, [dismissalKey]);

  if (!relevant || dismissed !== false || period.daysLeft === null) return null;

  const title =
    period.daysLeft === 0
      ? t("subscription.reminderToday")
      : period.daysLeft === 1
        ? t("subscription.reminderTomorrow")
        : t("subscription.reminderDays", { count: period.daysLeft });

  return (
    <View style={styles.banner}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={t("subscription.reminderAction")}
        onPress={() => navigation.navigate("Subscription")}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <Ionicons name="time-outline" size={18} color={theme.warningColor} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {t("subscription.reminderAction")}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("subscription.reminderDismiss")}
        hitSlop={8}
        onPress={dismiss}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={16} color={theme.textMuted} />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    banner: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: `${theme.warningColor}55`,
      backgroundColor: `${theme.warningColor}12`,
    },
    main: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingLeft: 12,
      paddingVertical: 6,
    },
    copy: { flex: 1, minWidth: 0, gap: 1 },
    title: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    close: {
      width: 40,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.7 },
  });
