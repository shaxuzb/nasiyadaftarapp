import React, { memo, useCallback, useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { PrimaryButton } from "../../../components/PrimaryButton";
import {
  ConfirmDialogProvider,
  useConfirmDialog,
} from "../../../context/ConfirmDialogContext";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";

interface CardProps {
  /** The document's name as the server gives it; the app's own otherwise. */
  title: string | null;
  accepting: boolean;
  loggingOut: boolean;
  /** A problem with the last action, shown above the button. */
  error: string | null;
  /** Something the user should know that is not a failure. */
  notice: string | null;
  onRead: () => void;
  onAccept: () => void;
  /** Called once the user has confirmed that they want to sign out. */
  onLogout: () => void;
}

interface Props extends CardProps {
  visible: boolean;
}

const ignoreClose = () => undefined;

/**
 * The public offer, for a user who has not accepted the current version.
 *
 * It cannot be dismissed: no close button, no tap outside, and the Android
 * back button does nothing. The ways on are to accept, or to sign out.
 *
 * Messages are shown inside the card. A toast would be drawn underneath: a
 * modal is a window of its own, above the rest of the app.
 */
export const OfferAcceptanceModal = memo(function OfferAcceptanceModal({
  visible,
  ...card
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={ignoreClose}
    >
      {/* The "sign out?" question is a modal too. It gets its own provider
          inside this one, so it is presented from this window: the app-wide
          dialog belongs to the window underneath and cannot be shown over
          a modal that is already up. */}
      <ConfirmDialogProvider>
        <OfferAcceptanceCard {...card} />
      </ConfirmDialogProvider>
    </Modal>
  );
});

function OfferAcceptanceCard({
  title,
  accepting,
  loggingOut,
  error,
  notice,
  onRead,
  onAccept,
  onLogout,
}: CardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const busy = accepting || loggingOut;
  const heading = title ?? t("offer.title");

  // The same question the profile asks. Signing out is not undone by a tap,
  // and here it sits right under the button most people are reaching for.
  const handleLogoutPress = useCallback(async () => {
    const accepted = await confirm({
      title: t("profile.logoutTitle"),
      message: t("profile.logoutMessage"),
      confirmText: t("profile.logout"),
      cancelText: t("common.cancel"),
      variant: "danger",
    });
    if (accepted) onLogout();
  }, [confirm, onLogout, t]);

  return (
    <View style={styles.overlay}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <View accessibilityViewIsModal style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="document-text-outline"
              size={30}
              color={theme.primary}
            />
          </View>
          <Text accessibilityRole="header" style={styles.title}>
            {heading}
          </Text>
          <Text style={styles.description}>{t("offer.description")}</Text>

          <Pressable
            accessibilityRole="link"
            accessibilityLabel={t("offer.read")}
            onPress={onRead}
            style={({ pressed }) => [styles.readRow, pressed && styles.pressed]}
          >
            <Ionicons
              name="document-text-outline"
              size={20}
              color={theme.primary}
            />
            <Text style={styles.readText} numberOfLines={1}>
              {t("offer.read")}
            </Text>
            <Ionicons name="open-outline" size={18} color={theme.textMuted} />
          </Pressable>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : notice ? (
            <Text accessibilityLiveRegion="polite" style={styles.notice}>
              {notice}
            </Text>
          ) : null}

          <PrimaryButton
            label={t("offer.accept")}
            onPress={onAccept}
            loading={accepting}
            disabled={busy}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("profile.logout")}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void handleLogoutPress()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.logout,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            <Text style={styles.logoutText}>{t("profile.logout")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(7, 20, 38, 0.56)",
    },
    scroll: { flex: 1 },
    // Centred, and still reachable when the text is set very large or the
    // screen is short: the card then scrolls instead of being cut off.
    scrollContent: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
    },
    card: {
      width: "100%",
      maxWidth: 440,
      gap: spacing.md,
      padding: spacing.lg,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    iconWrap: {
      width: 64,
      height: 64,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    title: {
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
    },
    description: {
      ...typography.bodySmall,
      lineHeight: 20,
      color: theme.textSecondary,
      textAlign: "center",
    },
    readRow: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    readText: {
      flex: 1,
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    error: {
      ...typography.bodySmall,
      color: theme.dangerColor,
      textAlign: "center",
    },
    notice: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: "center",
    },
    logout: {
      minHeight: 40,
      alignSelf: "center",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    logoutText: {
      ...typography.label,
      color: theme.textMuted,
    },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
