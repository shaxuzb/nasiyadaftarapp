import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrganizationRole } from "../modules/organization/hooks/useOrganizationRole";
import { useOrganizationAccess } from "../modules/organization/hooks/useOrganizationAccess";
import { useOrganizationProfileUpdate } from "../modules/organization/hooks/useOrganizationProfileUpdate";
import { getOrganizationNameError } from "../modules/organization/utils/organizationNameError";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomSheet } from "../bottom-sheet";
import { registerBackHandler } from "../bottom-sheet/backHandlerRegistry";
import { APP_VERSION } from "../config/appInfo";
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
import { closeQuickMenu, useQuickMenuOpen } from "./quickMenuState";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const ENTER_MS = 280;
const EXIT_MS = 220;
/** A drawer, not a screen: most of the width on a phone, a column on a tablet. */
const MAX_WIDTH = 360;
/** Let go past this share of its width (or flicked left), it closes. */
const CLOSE_SHARE = 0.35;
const CLOSE_VELOCITY = 600;

interface MenuRowProps {
  icon: IconName;
  /** In the icon's place: the flag of the language in use. */
  leading?: React.ReactNode;
  title: string;
  value: string;
  /** Before the chevron: the currency's code. */
  trailing?: React.ReactNode;
  locked?: boolean;
  isLast?: boolean;
  onPress: () => void;
}

/** A row as in Profile: icon tile, title, its current value, chevron. */
function MenuRow({ icon, leading, title, value, trailing, locked, isLast, onPress }: MenuRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}`}
      accessibilityState={{ disabled: locked }}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !isLast && styles.rowDivider, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>{leading ?? <Ionicons name={icon} size={20} color={theme.primary} />}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.rowValue} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <View style={styles.rowEnd}>
        {trailing}
        <Ionicons
          name={locked ? "lock-closed-outline" : "chevron-forward"}
          size={locked ? 16 : 19}
          color={theme.textMuted}
        />
      </View>
    </Pressable>
  );
}

/**
 * The customers screen's quick menu, sliding in from the left.
 *
 * Drawn once over the whole app, under the bottom sheets: the language and
 * currency sheets open on top of it and it stays open behind them, showing
 * the new value when they close. Switching the organization leaves the
 * screen, so that one closes it first.
 *
 * Closed by dragging it left (it follows the finger), tapping outside, the
 * close button or Android back; and at once when the app locks.
 */
export function QuickMenuDrawer() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const visible = useQuickMenuOpen();
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
  const { isOwner } = useOrganizationRole();
  const { readOnly } = useOrganizationAccess();
  const mayUpdateShop =
    isOwner &&
    !readOnly &&
    Boolean(currentOrganization) &&
    (user?.permissions ?? []).includes("ORGANIZATION_UPDATE");
  const canChangeCurrency = mayUpdateShop;
  const { saveOrganizationProfile } = useOrganizationProfileUpdate();

  // Kept on screen while it slides away, after `visible` has turned false.
  const [mounted, setMounted] = useState(visible);
  // 0 closed … 1 open; the drag moves it directly.
  const progress = useSharedValue(0);
  // Its own width, as drawn ("86%", at most MAX_WIDTH).
  const width = useSharedValue(MAX_WIDTH);
  // Run once the drawer is gone: the organization choice opens over the app, not under it.
  const afterCloseRef = useRef<(() => void) | null>(null);

  const finishClose = useCallback(() => {
    setMounted(false);
    const next = afterCloseRef.current;
    afterCloseRef.current = null;
    next?.();
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.set(withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) }));
      return;
    }
    progress.set(
      withTiming(0, { duration: EXIT_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finishClose);
      }),
    );
  }, [finishClose, progress, visible]);

  // Not left open over the PIN screen, nor over another account or organization.
  useDismissOnAppLock(closeQuickMenu);
  const organizationId = currentOrganization?.id ?? null;
  const openedForRef = useRef(organizationId);
  useEffect(() => {
    if (openedForRef.current !== organizationId) closeQuickMenu();
    openedForRef.current = organizationId;
  }, [organizationId]);
  useEffect(() => {
    if (!user) closeQuickMenu();
  }, [user]);

  // Android back closes it; a sheet opened over it registers later and goes first.
  useEffect(() => {
    if (!visible) return undefined;
    return registerBackHandler(() => {
      closeQuickMenu();
      return true;
    });
  }, [visible]);

  const handleSwitchOrganization = useCallback(() => {
    afterCloseRef.current = () => {
      openOrganizationSelector("Customers").catch((error: unknown) => {
        showToast(getLocalizedApiErrorMessage(error, "profile.switchOrganizationError", t), "error");
      });
    };
    closeQuickMenu();
  }, [openOrganizationSelector, showToast, t]);

  const handleLanguage = useCallback(() => openSheet("language", {}), [openSheet]);
  // The shop's own things, for its owner: open over the menu, like language.
  const handleStaff = useCallback(() => openSheet("staff", {}), [openSheet]);
  const handleEditShop = useCallback(() => {
    if (!currentOrganization) return;
    openSheet("organizationProfile", {
      organization: currentOrganization,
      onSubmit: async (payload) => {
        try {
          await saveOrganizationProfile(payload);
        } catch (error) {
          // A refused name is shown under the name field instead.
          if (!getOrganizationNameError(error)) {
            showToast(getLocalizedApiErrorMessage(error, "errors.generic", t), "error");
          }
          throw error;
        }
      },
    });
  }, [currentOrganization, openSheet, saveOrganizationProfile, showToast, t]);
  const handleCurrency = useCallback(() => openSheet("organizationCurrency", {}), [openSheet]);

  // Only a leftward drag takes over; vertical ones stay with the list.
  const dragGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-12)
        .failOffsetY([-14, 14])
        .onUpdate((event) => {
          const next = 1 + Math.min(0, event.translationX) / width.get();
          progress.set(Math.max(0, Math.min(1, next)));
        })
        .onEnd((event) => {
          const shouldClose =
            event.translationX < -width.get() * CLOSE_SHARE || event.velocityX < -CLOSE_VELOCITY;
          if (shouldClose) {
            scheduleOnRN(closeQuickMenu);
          } else {
            progress.set(withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }));
          }
        }),
    [progress, width],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.get(), [0, 1], [-width.get() - 24, 0]) }],
  }));

  if (!mounted) return null;

  const organizationName = currentOrganization?.name || t("profile.organizationNotSelected");

  return (
    <GestureDetector gesture={dragGesture}>
      <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeQuickMenu}
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
          />
        </Animated.View>

        <Animated.View
          onLayout={(event) => width.set(event.nativeEvent.layout.width)}
          style={[styles.panel, panelStyle]}
        >
          {/* The organization: whose book this is, and the way to another. */}
          <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                <Ionicons name="business" size={24} color="#FFFFFF" />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
                onPress={closeQuickMenu}
                hitSlop={8}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            <Text style={styles.eyebrow}>{t("profile.currentOrganization")}</Text>
            <Text style={styles.organizationName} numberOfLines={2}>
              {organizationName}
            </Text>
            {user?.phoneNumber ? (
              <Text style={styles.organizationMeta} numberOfLines={1}>
                {user.phoneNumber}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={handleSwitchOrganization}
              style={({ pressed }) => [styles.switchButton, pressed && styles.pressed]}
            >
              <Ionicons name="swap-horizontal" size={18} color={theme.primary} />
              <Text style={styles.switchText} numberOfLines={1}>
                {t("organization.selectTitle")}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isOwner ? (
              <>
                <Text style={styles.sectionTitle}>{t("profile.organizationSection")}</Text>
                <View style={[styles.card, styles.cardSpaced]}>
                  {mayUpdateShop ? (
                    <MenuRow
                      icon="create-outline"
                      title={t("profile.editOrganization")}
                      value={t("profile.editOrganizationHint")}
                      onPress={handleEditShop}
                    />
                  ) : null}
                  <MenuRow
                    icon="people-outline"
                    title={t("staff.title")}
                    value={t("staff.rowDescription")}
                    onPress={handleStaff}
                    isLast
                  />
                </View>
              </>
            ) : null}
            <Text style={styles.sectionTitle}>{t("quickMenu.preferences")}</Text>
            <View style={styles.card}>
              <MenuRow
                icon="language-outline"
                leading={<Text style={styles.flag}>{flagOf(currentLanguage.flag)}</Text>}
                title={t("auth.language")}
                value={currentLanguage.nativeName}
                onPress={handleLanguage}
              />
              <MenuRow
                icon="cash-outline"
                title={t("currency.rowTitle")}
                value={canChangeCurrency ? currency?.displayName ?? currencyCode : t("quickMenu.currencyLocked")}
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

          {APP_VERSION ? (
            <Text style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              Qarz Daftar · v{APP_VERSION}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
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
      shadowOffset: { width: 8, height: 0 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 24,
    },
    hero: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      borderCurve: "continuous",
      backgroundColor: theme.primary,
    },
    closeButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    eyebrow: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    organizationName: {
      marginTop: 2,
      color: theme.text,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    organizationMeta: { ...typography.bodySmall, marginTop: 2, color: theme.textSecondary },
    switchButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderCurve: "continuous",
      backgroundColor: theme.primaryLight,
    },
    switchText: { ...typography.label, color: theme.primary, fontWeight: "800" },
    scroll: { flex: 1 },
    content: { padding: spacing.md, paddingTop: spacing.lg },
    sectionTitle: {
      ...typography.caption,
      marginBottom: spacing.sm,
      marginLeft: 4,
      color: theme.textMuted,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    cardSpaced: { marginBottom: spacing.md },
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
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: spacing.sm,
    },
    rowPressed: { backgroundColor: theme.inputBackground },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowIcon: {
      width: 40,
      height: 40,
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
    rowValue: { ...typography.caption, color: theme.textMuted },
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
    footer: {
      ...typography.caption,
      paddingTop: spacing.sm,
      textAlign: "center",
      color: theme.textMuted,
    },
    pressed: { opacity: 0.7 },
  });
