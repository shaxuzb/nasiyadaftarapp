import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BackHandler,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/PrimaryButton";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { palette, radius, spacing, typography } from "../../../theme";
import { AppTheme } from "../../../types";
import { AvailableAppUpdate } from "../types/appUpdate.types";

interface AppUpdateBottomSheetProps {
  update: AvailableAppUpdate;
  isOpeningStore: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}

export function AppUpdateBottomSheet({
  update,
  isOpeningStore,
  onUpdate,
  onDismiss,
}: AppUpdateBottomSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalRef = useRef<BottomSheetModal>(null);
  const isIOS = update.platform === "ios";
  const styles = useMemo(() => createStyles(theme, isIOS), [isIOS, theme]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => modalRef.current?.present());
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (process.env.EXPO_OS !== "android") return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (update.isForced) return true;
        modalRef.current?.dismiss();
        return true;
      },
    );

    return () => subscription.remove();
  }, [update.isForced]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.52}
        pressBehavior={update.isForced ? "none" : "close"}
      />
    ),
    [update.isForced],
  );

  const handleDismiss = useCallback(() => {
    if (update.isForced) {
      requestAnimationFrame(() => modalRef.current?.present());
      return;
    }
    onDismiss();
  }, [onDismiss, update.isForced]);

  const dismissOptionalUpdate = useCallback(() => {
    modalRef.current?.dismiss();
  }, []);

  const iconName = isIOS ? "logo-apple" : "logo-google-playstore";
  const primaryAction = isIOS
    ? t("common.update.iosAction")
    : t("common.update.androidAction");

  const intro = (
    <>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t("common.appUpdateIcon")}
        style={styles.iconContainer}
      >
        <Ionicons
          name={iconName}
          size={isIOS ? 32 : 29}
          color={palette.white}
        />
      </View>
      <View style={styles.introContent}>
        <View style={styles.badge}>
          <Ionicons
            name={update.isForced ? "alert-circle" : "sparkles"}
            size={14}
            color={update.isForced ? theme.warningColor : theme.primary}
          />
          <Text
            style={[
              styles.badgeText,
              {
                color: update.isForced ? theme.warningColor : theme.primary,
              },
            ]}
          >
            {update.isForced
              ? t("common.update.requiredBadge")
              : t("common.update.optionalBadge")}
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {update.config.title}
        </Text>
        <Text style={styles.message}>{update.config.message}</Text>
      </View>
    </>
  );

  return (
    <BottomSheetModal
      ref={modalRef}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={Math.max(360, height - insets.top - spacing.md)}
      topInset={insets.top}
      enablePanDownToClose={!update.isForced}
      enableOverDrag={!update.isForced}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      stackBehavior="replace"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          accessibilityViewIsModal
          accessibilityLabel={t("common.appUpdateModal")}
          style={isIOS ? styles.iosIntro : styles.androidIntro}
        >
          {intro}
        </View>

        <View style={styles.versionCard}>
          <View style={styles.versionItem}>
            <Text style={styles.versionLabel}>
              {t("common.update.currentVersion")}
            </Text>
            <Text selectable style={styles.currentVersion}>
              {update.currentVersion}
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={19} color={theme.textMuted} />
          <View style={[styles.versionItem, styles.latestVersionItem]}>
            <Text style={styles.versionLabel}>
              {t("common.update.latestVersion")}
            </Text>
            <Text selectable style={styles.latestVersion}>
              {update.config.latestVersion}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={primaryAction}
            onPress={onUpdate}
            loading={isOpeningStore}
            disabled={isOpeningStore}
            style={styles.primaryButton}
          />
          {!update.isForced ? (
            <PrimaryButton
              label={t("common.update.laterAction")}
              onPress={dismissOptionalUpdate}
              disabled={isOpeningStore}
              variant="outline"
              style={styles.secondaryButton}
            />
          ) : null}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const createStyles = (theme: AppTheme, isIOS: boolean) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: isIOS ? radius.xl : 28,
      borderTopRightRadius: isIOS ? radius.xl : 28,
      borderCurve: "continuous",
    },
    handleIndicator: {
      width: isIOS ? 36 : 42,
      height: 4,
      backgroundColor: theme.textMuted,
      opacity: 0.55,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.lg,
    },
    androidIntro: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.md,
    },
    iosIntro: {
      alignItems: "center",
      gap: spacing.md,
    },
    iconContainer: {
      width: isIOS ? 68 : 58,
      height: isIOS ? 68 : 58,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: isIOS ? 21 : 18,
      borderCurve: "continuous",
      backgroundColor: theme.primary,
      boxShadow: theme.cardShadow,
    },
    introContent: {
      minWidth: 0,
      flex: isIOS ? undefined : 1,
      alignItems: isIOS ? "center" : "flex-start",
      gap: spacing.xs,
    },
    badge: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    badgeText: {
      ...typography.labelSmall,
      fontWeight: "700",
    },
    title: {
      ...(isIOS ? typography.headingLarge : typography.headingMedium),
      color: theme.text,
      textAlign: isIOS ? "center" : "left",
      paddingTop: spacing.xs,
    },
    message: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      textAlign: isIOS ? "center" : "left",
    },
    versionCard: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: isIOS ? radius.lg : 18,
      borderCurve: "continuous",
    },
    versionItem: {
      minWidth: 0,
      flex: 1,
      gap: spacing.xs,
    },
    latestVersionItem: {
      alignItems: "flex-end",
    },
    versionLabel: {
      ...typography.caption,
      color: theme.textMuted,
    },
    currentVersion: {
      ...typography.headingMedium,
      color: theme.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    latestVersion: {
      ...typography.headingMedium,
      color: theme.primary,
      fontVariant: ["tabular-nums"],
    },
    actions: {
      gap: spacing.sm,
    },
    primaryButton: {
      minHeight: isIOS ? 54 : 52,
      borderRadius: isIOS ? radius.lg : radius.full,
    },
    secondaryButton: {
      minHeight: isIOS ? 50 : 48,
      borderRadius: isIOS ? radius.lg : radius.full,
    },
  });
