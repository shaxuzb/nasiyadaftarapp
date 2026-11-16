import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomSheet } from "../bottom-sheet";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import { useNamedCurrencies } from "../modules/currency/hooks/useCurrencies";
import { useOrganizationCurrencyCode } from "../modules/currency/hooks/useMoney";
import { flagOf } from "../modules/phone/utils/phoneNumber";
import { useDismissOnAppLock } from "../modules/pin-auth/hooks/useDismissOnAppLock";
import { getSetupLanguage } from "../modules/setup/data/setupOptions";
import { radius, spacing, typography } from "../theme";
import type { AppTheme } from "../types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ENTER_MS = 260;
const EXIT_MS = 200;
/** A drawer, not a screen: most of the width on a phone, a column on a tablet. */
const MAX_WIDTH = 360;

interface QuickMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuRowProps {
  icon: IconName;
  /** In the icon's place: the flag of the language in use. */
  leading?: React.ReactNode;
  title: string;
  description?: string;
  /** The current value, before the chevron: "UZS so'm". */
  trailing?: React.ReactNode;
  locked?: boolean;
  isLast?: boolean;
  onPress: () => void;
}

/** A row as in Profile: icon tile, title, the value under it, chevron. */
function MenuRow({ icon, leading, title, description, trailing, locked, isLast, onPress }: MenuRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>{leading ?? <Ionicons name={icon} size={20} color={theme.primary} />}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.rowDescription} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowEnd}>
        {trailing}
        <Ionicons
          name={locked ? "lock-closed-outline" : "chevron-forward"}
          size={locked ? 17 : 20}
          color={theme.textMuted}
        />
      </View>
    </Pressable>
  );
}

/**
 * The customers screen's quick menu, sliding in from the left. Laid out as
 * Profile is: the organization's card, then one card of rows — switch the
 * organization, the language, the currency — each opening the same screen or
 * sheet as in Settings. The drawer closes first, so what opens is on top.
 */
export function QuickMenuDrawer({ visible, onClose }: QuickMenuDrawerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  // Its own width, as drawn ("86%", at most MAX_WIDTH): how far it slides and is swiped.
  const [width, setWidth] = useState(MAX_WIDTH);
  const { locale, t } = useTranslation();
  const currentLanguage = getSetupLanguage(locale);
  const { user, currentOrganization, openOrganizationSelector } = useAuth();
  const { openSheet } = useBottomSheet();
  const { showToast } = useToast();
  const currencyCode = useOrganizationCurrencyCode();
  const namedCurrencies = useNamedCurrencies();
  const currency = namedCurrencies.find((item) => item.code === currencyCode);
  const currencySymbol = currency && currency.symbol !== currencyCode ? currency.symbol : null;
  // The same rule as the Settings row.
  const canChangeCurrency =
    Boolean(currentOrganization) && (user?.permissions ?? []).includes("ORGANIZATION_UPDATE");

  // Kept on screen while it slides away, after `visible` has turned false.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  // Run once the drawer is gone: a sheet or a screen opens over the app, not under it.
  const afterCloseRef = useRef<(() => void) | null>(null);

  const animateTo = useCallback(
    (toValue: 0 | 1, onDone?: () => void) => {
      Animated.timing(progress, {
        toValue,
        duration: toValue ? ENTER_MS : EXIT_MS,
        easing: toValue ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDone?.();
      });
    },
    [progress],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      animateTo(1);
      return;
    }
    animateTo(0, () => {
      setMounted(false);
      const next = afterCloseRef.current;
      afterCloseRef.current = null;
      next?.();
    });
  }, [animateTo, visible]);

  useDismissOnAppLock(onClose);

  const closeThen = useCallback(
    (action: () => void) => {
      afterCloseRef.current = action;
      onClose();
    },
    [onClose],
  );

  const handleSwitchOrganization = useCallback(() => {
    closeThen(() => {
      openOrganizationSelector("Customers").catch((error: unknown) => {
        showToast(getLocalizedApiErrorMessage(error, "profile.switchOrganizationError", t), "error");
      });
    });
  }, [closeThen, openOrganizationSelector, showToast, t]);

  const handleLanguage = useCallback(() => {
    closeThen(() => openSheet("language", {}));
  }, [closeThen, openSheet]);

  const handleCurrency = useCallback(() => {
    closeThen(() => openSheet("organizationCurrency", {}));
  }, [closeThen, openSheet]);

  // Swiped back to the left, it follows the finger and closes past a third.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => g.dx < -10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_, g) => {
          progress.setValue(Math.max(0, Math.min(1, 1 + g.dx / width)));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx < -width / 3 || g.vx < -0.6) onClose();
          else animateTo(1);
        },
        onPanResponderTerminate: () => animateTo(1),
      }),
    [animateTo, onClose, progress, width],
  );

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("common.close")} />
      </Animated.View>

      <Animated.View
        accessibilityViewIsModal
        {...panResponder.panHandlers}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[
          styles.panel,
          {
            paddingTop: insets.top + spacing.md,
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width - 24, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {t("quickMenu.title")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={20} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Whose book this is, as on the Profile card. */}
          <View style={styles.organizationCard}>
            <View style={styles.organizationAvatar}>
              <Ionicons name="business-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.organizationIdentity}>
              <Text style={styles.organizationEyebrow}>{t("profile.currentOrganization")}</Text>
              <Text style={styles.organizationName} numberOfLines={2}>
                {currentOrganization?.name || t("profile.organizationNotSelected")}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <MenuRow
              icon="swap-horizontal-outline"
              title={t("organization.selectTitle")}
              onPress={handleSwitchOrganization}
            />
            <MenuRow
              icon="language-outline"
              leading={<Text style={styles.flag}>{flagOf(currentLanguage.flag)}</Text>}
              title={t("auth.language")}
              description={currentLanguage.nativeName}
              onPress={handleLanguage}
            />
            <MenuRow
              icon="cash-outline"
              title={t("currency.rowTitle")}
              description={
                canChangeCurrency ? currency?.displayName ?? currencyCode : t("quickMenu.currencyLocked")
              }
              trailing={
                <View style={styles.currencyValue}>
                  <Text style={styles.currencyCode}>{currencyCode}</Text>
                  {currencySymbol ? <Text style={styles.currencySymbol}>{currencySymbol}</Text> : null}
                </View>
              }
              locked={!canChangeCurrency}
              onPress={handleCurrency}
              isLast
            />
          </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(8, 15, 30, 0.5)",
    },
    panel: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: "86%",
      maxWidth: MAX_WIDTH,
      backgroundColor: theme.background,
      borderTopRightRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      borderCurve: "continuous",
      overflow: "hidden",
      shadowColor: "#000",
      shadowOffset: { width: 6, height: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 18,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    title: {
      flex: 1,
      color: theme.text,
      fontSize: 22,
      lineHeight: 28,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    closeButton: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.md, gap: spacing.md },
    organizationCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    organizationAvatar: {
      width: 52,
      height: 52,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      borderCurve: "continuous",
      backgroundColor: theme.primaryLight,
    },
    organizationIdentity: { minWidth: 0, flex: 1, gap: 3 },
    organizationEyebrow: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    organizationName: { ...typography.headingMedium, color: theme.text },
    card: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    row: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: spacing.sm,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowIcon: {
      width: 38,
      height: 38,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      borderCurve: "continuous",
      backgroundColor: theme.primaryLight,
    },
    flag: { fontSize: 22, lineHeight: 28 },
    rowCopy: { minWidth: 0, flex: 1, gap: 2 },
    rowTitle: { ...typography.label, color: theme.text, fontWeight: "700" },
    rowDescription: { ...typography.caption, color: theme.textMuted },
    rowEnd: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    currencyValue: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    currencyCode: { color: theme.primary, fontSize: 12, lineHeight: 16, fontWeight: "800", letterSpacing: 0.3 },
    currencySymbol: { color: theme.primary, fontSize: 12, lineHeight: 16, fontWeight: "600" },
    pressed: { opacity: 0.7 },
  });
