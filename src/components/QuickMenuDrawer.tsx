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
import { getLocalizedApiErrorMessage, useTranslation, type Locale } from "../i18n";
import { useNamedCurrencies } from "../modules/currency/hooks/useCurrencies";
import { useOrganizationCurrencyCode } from "../modules/currency/hooks/useMoney";
import { flagOf } from "../modules/phone/utils/phoneNumber";
import { useDismissOnAppLock } from "../modules/pin-auth/hooks/useDismissOnAppLock";
import { SETUP_LANGUAGES } from "../modules/setup/data/setupOptions";
import { radius, spacing, typography } from "../theme";
import type { AppTheme } from "../types";

const ENTER_MS = 260;
const EXIT_MS = 200;
/** A drawer, not a screen: most of the width on a phone, a column on a tablet. */
const MAX_WIDTH = 380;

interface QuickMenuDrawerProps {
  visible: boolean;
  onClose: () => void;
}

/** "Nasiya Market" → "NM"; one word → its first two letters. */
function organizationInitials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * The customers screen's quick menu, sliding in from the left: the
 * organization (switch it), the app's language (changed at once, in place)
 * and the organization's currency (through its own sheet, which warns that
 * amounts are not converted). The same actions as in Settings, one tap away.
 */
export function QuickMenuDrawer({ visible, onClose }: QuickMenuDrawerProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  // Its own width, as drawn ("86%", at most MAX_WIDTH): how far it slides and is swiped.
  const [width, setWidth] = useState(MAX_WIDTH);
  const { locale, setLocale, t } = useTranslation();
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

  const handleCurrency = useCallback(() => {
    closeThen(() => openSheet("organizationCurrency", {}));
  }, [closeThen, openSheet]);

  const handleLanguage = useCallback(
    (next: Locale) => {
      if (next !== locale) setLocale(next);
    },
    [locale, setLocale],
  );

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

  const organizationName = currentOrganization?.name ?? "";

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
            paddingTop: insets.top + spacing.sm,
            transform: [
              { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-width - 24, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
              {t("quickMenu.title")}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t("quickMenu.subtitle")}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            hitSlop={8}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Organization: whose book this is, and the way to another. */}
          <Text style={styles.sectionTitle}>{t("profile.currentOrganization")}</Text>
          <View style={styles.organizationCard}>
            <View style={styles.organizationRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{organizationInitials(organizationName)}</Text>
              </View>
              <Text style={styles.organizationName} numberOfLines={2}>
                {organizationName}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("organization.selectTitle")}
              onPress={handleSwitchOrganization}
              style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
            >
              <Ionicons name="swap-horizontal" size={18} color={theme.primary} />
              <Text style={styles.switchText}>{t("quickMenu.switchOrganization")}</Text>
            </Pressable>
          </View>

          {/* Language: tapped, the app changes at once; the drawer stays. */}
          <Text style={styles.sectionTitle}>{t("auth.language")}</Text>
          <View style={styles.languageGrid} accessibilityRole="radiogroup">
            {SETUP_LANGUAGES.map((language) => {
              if (!language.locale) return null;
              const code = language.locale;
              const selected = code === locale;
              return (
                <Pressable
                  key={language.code}
                  accessibilityRole="radio"
                  accessibilityLabel={language.nativeName}
                  accessibilityState={{ selected }}
                  onPress={() => handleLanguage(code)}
                  style={({ pressed }) => [
                    styles.languageOption,
                    selected && styles.languageOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.flag}>{flagOf(language.flag)}</Text>
                  <Text
                    style={[styles.languageName, selected && styles.languageNameSelected]}
                    numberOfLines={1}
                  >
                    {language.nativeName}
                  </Text>
                  {selected ? <Ionicons name="checkmark-circle" size={16} color={theme.primary} /> : null}
                </Pressable>
              );
            })}
          </View>

          {/* Currency: through its sheet, which asks first and says amounts stay as they are. */}
          <Text style={styles.sectionTitle}>{t("currency.rowTitle")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canChangeCurrency }}
            disabled={!canChangeCurrency}
            onPress={handleCurrency}
            style={({ pressed }) => [styles.currencyRow, pressed && styles.pressed]}
          >
            <View style={styles.currencyBadge}>
              <Text style={styles.currencyCode}>{currencyCode}</Text>
              {currencySymbol ? <Text style={styles.currencySymbol}>{currencySymbol}</Text> : null}
            </View>
            <View style={styles.currencyCopy}>
              <Text style={styles.currencyName} numberOfLines={1}>
                {currency?.displayName ?? currencyCode}
              </Text>
              {canChangeCurrency ? null : (
                <Text style={styles.currencyHint} numberOfLines={2}>
                  {t("quickMenu.currencyLocked")}
                </Text>
              )}
            </View>
            <Ionicons
              name={canChangeCurrency ? "chevron-forward" : "lock-closed-outline"}
              size={canChangeCurrency ? 20 : 17}
              color={theme.textMuted}
            />
          </Pressable>
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
      borderTopRightRadius: 28,
      borderBottomRightRadius: 28,
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
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
    },
    headerCopy: { flex: 1, gap: 2 },
    title: {
      ...typography.headingLarge,
      color: theme.text,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    subtitle: { ...typography.bodySmall, color: theme.textSecondary },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 20,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg },
    sectionTitle: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    organizationCard: {
      gap: 14,
      padding: 14,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    organizationRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: {
      width: 48,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      borderCurve: "continuous",
      backgroundColor: theme.primary,
    },
    avatarText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
    organizationName: {
      flex: 1,
      ...typography.headingSmall,
      color: theme.text,
      fontWeight: "800",
    },
    switchButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    switchText: { ...typography.label, color: theme.primary, fontWeight: "800" },
    languageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    languageOption: {
      // Two to a row, the gap between them shared.
      flexBasis: "47%",
      flexGrow: 1,
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    languageOptionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    flag: { fontSize: 18 },
    languageName: { flex: 1, ...typography.bodySmall, color: theme.text, fontWeight: "600" },
    languageNameSelected: { color: theme.primary, fontWeight: "800" },
    currencyRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    currencyBadge: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    currencyCode: { color: theme.primary, fontSize: 13, lineHeight: 17, fontWeight: "800", letterSpacing: 0.3 },
    currencySymbol: { color: theme.primary, fontSize: 13, lineHeight: 17, fontWeight: "600" },
    currencyCopy: { flex: 1, gap: 2 },
    currencyName: { ...typography.bodyMedium, color: theme.text, fontWeight: "700" },
    currencyHint: { ...typography.caption, color: theme.textMuted },
    pressed: { opacity: 0.75 },
  });
