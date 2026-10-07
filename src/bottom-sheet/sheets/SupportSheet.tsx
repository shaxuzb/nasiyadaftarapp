import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import {
  useAppLinks,
  useLinkOpener,
} from "../../modules/support/hooks/useAppLinks";
import {
  getAppLinkDescription,
  getAppLinkIcon,
  getAppLinkTitle,
} from "../../modules/support/utils/appLinkPresentation";
import { getSupportSheetLinks } from "../../modules/support/utils/appLinks";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import type { SheetRenderProps } from "../types";

export function SupportSheet({ closeSheet }: SheetRenderProps<"support">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const links = useAppLinks();
  const { openingKey, open } = useLinkOpener();

  // The admin contact and the discussion group, plus any link the server adds
  // later; the two public profiles are icons in the profile header instead. A
  // key the app has no wording for yet still appears here, with the server's
  // title and a generic icon.
  const options = useMemo(
    () =>
      getSupportSheetLinks(links).map((link) => ({
        key: link.key,
        icon: getAppLinkIcon(link.key),
        title: getAppLinkTitle(link, t),
        description: getAppLinkDescription(link, t),
        loading: openingKey === link.key,
        onPress: () => void open(link),
      })),
    [links, open, openingKey, t],
  );

  const busy = openingKey !== null;

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
        {options.length === 0 ? (
          <Text style={styles.empty}>{t("support.empty")}</Text>
        ) : null}
        {options.map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="link"
            accessibilityLabel={option.title}
            accessibilityHint={option.description || undefined}
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
              {option.description ? (
                <Text style={styles.optionDescription} numberOfLines={2}>
                  {option.description}
                </Text>
              ) : null}
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
    empty: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      textAlign: "center",
      paddingVertical: spacing.lg,
    },
    pressed: { opacity: 0.72 },
    dimmed: { opacity: 0.5 },
  });
