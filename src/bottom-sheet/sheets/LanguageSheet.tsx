import React, { useCallback, useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import type { Locale } from "../../i18n";
import type { SheetRenderProps } from "../types";

const LANGUAGE_OPTIONS: ReadonlyArray<{
  locale: Locale;
  labelKey: "auth.uzbek" | "auth.russian";
}> = [
  { locale: "uz", labelKey: "auth.uzbek" },
  { locale: "ru", labelKey: "auth.russian" },
];

export function LanguageSheet({
  closeSheet,
}: SheetRenderProps<"language">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useTranslation();

  const handleSelect = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale === locale) {
        closeSheet();
        return;
      }

      setLocale(nextLocale);
      closeSheet();
    },
    [closeSheet, locale, setLocale],
  );

  return (
    <BottomSheetView
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="language-outline" size={22} color={theme.primary} />
          </View>
          <Text style={styles.title}>{t("auth.chooseLanguage")}</Text>
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
        {LANGUAGE_OPTIONS.map((option) => {
          const selected = option.locale === locale;
          return (
            <Pressable
              key={option.locale}
              accessibilityRole="radio"
              accessibilityLabel={t(option.labelKey)}
              accessibilityState={{ selected }}
              onPress={() => handleSelect(option.locale)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.localeBadge, selected && styles.localeBadgeSelected]}>
                <Text style={[styles.localeCode, selected && styles.localeCodeSelected]}>
                  {option.locale.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.optionLabel}>{t(option.labelKey)}</Text>
              {selected ? (
                <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              ) : (
                <View style={styles.unselectedMark} />
              )}
            </Pressable>
          );
        })}
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
    title: {
      ...typography.headingMedium,
      color: theme.text,
    },
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
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    optionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    localeBadge: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.inputBackground,
    },
    localeBadgeSelected: { backgroundColor: theme.surface },
    localeCode: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "800",
    },
    localeCodeSelected: { color: theme.primary },
    optionLabel: {
      flex: 1,
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    unselectedMark: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    pressed: { opacity: 0.72 },
  });
