import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { useAdminContact } from "../../modules/support/hooks/useAdminContact";
import { useSocialLinks } from "../../modules/support/hooks/useSocialLinks";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import type { SheetRenderProps } from "../types";

export function SupportSheet({ closeSheet }: SheetRenderProps<"support">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { isOpening: isOpeningAdmin, openAdminContact } = useAdminContact();
  const { opening, open } = useSocialLinks();

  const options = useMemo(
    () =>
      [
        {
          key: "admin",
          icon: "chatbubble-ellipses-outline",
          title: t("support.adminTitle"),
          description: t("support.adminDescription"),
          loading: isOpeningAdmin,
          onPress: () => void openAdminContact(),
        },
        {
          key: "community",
          icon: "people-outline",
          title: t("support.communityTitle"),
          description: t("support.communityDescription"),
          loading: opening === "community",
          onPress: () => void open("community"),
        },
      ] as const,
    [isOpeningAdmin, open, openAdminContact, opening, t],
  );

  const busy = isOpeningAdmin || opening !== null;

  return (
    <BottomSheetView
      // Android reserves the strip along the bottom for its navigation bar or
      // gesture handle. Without this the last row sits underneath it.
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="headset-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{t("support.sheetTitle")}</Text>
            <Text style={styles.subtitle}>{t("support.sheetSubtitle")}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => closeSheet()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={21} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.options}>
        {options.map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={option.title}
            accessibilityHint={option.description}
            accessibilityState={{ disabled: busy, busy: option.loading }}
            disabled={busy}
            onPress={option.onPress}
            style={({ pressed }) => [
              styles.option,
              pressed && styles.pressed,
              busy && !option.loading && styles.dimmed,
            ]}
          >
            <View style={styles.optionIcon}>
              <Ionicons name={option.icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle} numberOfLines={1}>
                {option.title}
              </Text>
              <Text style={styles.optionDescription} numberOfLines={2}>
                {option.description}
              </Text>
            </View>
            {option.loading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textMuted}
              />
            )}
          </Pressable>
        ))}
      </View>
    </BottomSheetView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconWrap: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },
    titleCopy: { flex: 1, gap: 2 },
    title: { ...typography.headingMedium, color: theme.text },
    subtitle: { ...typography.caption, color: theme.textSecondary },
    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    options: { gap: spacing.xs },
    option: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    optionIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
    optionCopy: { flex: 1, gap: 2 },
    optionTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    optionDescription: { ...typography.caption, color: theme.textSecondary },
    pressed: { opacity: 0.72 },
    dimmed: { opacity: 0.5 },
  });
