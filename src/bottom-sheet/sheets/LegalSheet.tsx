import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "../../config/legalLinks";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { useLinkOpener } from "../../modules/support/hooks/useAppLinks";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import type { SheetRenderProps } from "../types";

// The two documents the app is used under. Their addresses are fixed in the
// app (config/legalLinks); nothing here comes from the server.
const DOCUMENTS = [
  {
    key: "terms_of_service",
    icon: "document-text-outline",
    titleKey: "legal.terms.title",
    descriptionKey: "legal.terms.description",
    url: TERMS_OF_SERVICE_URL,
  },
  {
    key: "privacy_policy",
    icon: "shield-checkmark-outline",
    titleKey: "legal.privacy.title",
    descriptionKey: "legal.privacy.description",
    url: PRIVACY_POLICY_URL,
  },
] as const;

export function LegalSheet({ closeSheet }: SheetRenderProps<"legal">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { openingKey, open } = useLinkOpener();
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
            <Ionicons
              name="document-text-outline"
              size={22}
              color={theme.primary}
            />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{t("legal.sheetTitle")}</Text>
            <Text style={styles.subtitle}>{t("legal.sheetSubtitle")}</Text>
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
        {DOCUMENTS.map((document) => {
          const loading = openingKey === document.key;
          const title = t(document.titleKey);
          const description = t(document.descriptionKey);
          return (
            <Pressable
              key={document.key}
              accessibilityRole="link"
              accessibilityLabel={title}
              accessibilityHint={description}
              accessibilityState={{ disabled: busy, busy: loading }}
              disabled={busy}
              onPress={() => void open(document)}
              style={({ pressed }) => [
                styles.option,
                pressed && styles.pressed,
                busy && !loading && styles.dimmed,
              ]}
            >
              <View style={styles.optionIcon}>
                <Ionicons name={document.icon} size={20} color={theme.primary} />
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle} numberOfLines={1}>
                  {title}
                </Text>
                <Text style={styles.optionDescription} numberOfLines={2}>
                  {description}
                </Text>
              </View>
              {loading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                // Leaves the app for the browser, unlike a row that goes
                // deeper into the app.
                <Ionicons name="open-outline" size={18} color={theme.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>
    </BottomSheetView>
  );
}

// The same frame as the Telegram bots sheet, so the two read as siblings.
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
