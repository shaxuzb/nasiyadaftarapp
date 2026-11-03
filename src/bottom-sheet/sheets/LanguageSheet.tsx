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
import { useTranslation, type TranslateKey } from "../../i18n";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import type { Locale } from "../../i18n";
import { flagOf } from "../../modules/phone/utils/phoneNumber";
import { SETUP_LANGUAGES } from "../../modules/setup/data/setupOptions";
import type { SheetRenderProps } from "../types";

/**
 * The same languages as on first launch, with their flags: the translated
 * ones to choose from, the rest listed as coming soon.
 */
export function LanguageSheet({
  closeSheet,
}: SheetRenderProps<"language">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { locale, setLocale, t } = useTranslation();

  const handleSelect = useCallback(
    (nextLocale: Locale) => {
      if (nextLocale !== locale) setLocale(nextLocale);
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

      <View style={styles.options} accessibilityRole="radiogroup">
        {SETUP_LANGUAGES.map((language) => {
          const available = language.locale !== null;
          const selected = language.locale === locale;
          const localName = t(`setup.languageNames.${language.code}` as TranslateKey);
          return (
            <Pressable
              key={language.code}
              accessibilityRole="radio"
              accessibilityLabel={[
                language.nativeName,
                localName,
                available ? null : t("setup.comingSoon"),
              ]
                .filter(Boolean)
                .join(", ")}
              accessibilityState={{ selected, disabled: !available }}
              disabled={!available}
              onPress={() => language.locale && handleSelect(language.locale)}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                !available && styles.optionDisabled,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.flagWrap}>
                <Text style={styles.flag}>{flagOf(language.flag)}</Text>
              </View>
              <View style={styles.optionCopy}>
                <Text
                  style={[styles.optionLabel, selected && styles.optionLabelSelected]}
                  numberOfLines={1}
                >
                  {language.nativeName}
                </Text>
                <Text style={styles.optionHint} numberOfLines={1}>
                  {localName}
                </Text>
              </View>
              {!available ? (
                <View style={styles.soonBadge}>
                  <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                  <Text style={styles.soonText}>{t("setup.comingSoon")}</Text>
                </View>
              ) : selected ? (
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
    options: { gap: 6 },
    // Compact enough for all eight on a small phone, without scrolling.
    option: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    optionSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    optionDisabled: { opacity: 0.55 },
    flagWrap: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    flag: { fontSize: 22, lineHeight: 28 },
    optionCopy: { flex: 1, minWidth: 0, gap: 1 },
    optionLabel: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    optionLabelSelected: { color: theme.primary },
    optionHint: { ...typography.caption, color: theme.textSecondary },
    soonBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    soonText: { ...typography.caption, color: theme.textSecondary, fontWeight: "700" },
    unselectedMark: {
      width: 22,
      height: 22,
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    pressed: { opacity: 0.72 },
  });
