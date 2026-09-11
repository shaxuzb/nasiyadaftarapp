import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useBottomSheet } from "../bottom-sheet";
import { useTranslation } from "../i18n";
import { radius, spacing, typography } from "../theme";
import { useTheme } from "../hooks/useTheme";

export const LanguageSelectorButton = React.memo(
  function LanguageSelectorButton() {
    const theme = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const { locale, t } = useTranslation();
    const { openSheet } = useBottomSheet();

    const handlePress = useCallback(() => {
      openSheet("language", {});
    }, [openSheet]);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("auth.language")}
        accessibilityHint={t("auth.chooseLanguage")}
        onPress={handlePress}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Ionicons name="language-outline" size={18} color={theme.primary} />
        <Text style={styles.label}>{locale.toUpperCase()}</Text>
      </Pressable>
    );
  },
);

const createStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    button: {
      minWidth: 64,
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: `${theme.primary}55`,
      backgroundColor: theme.primaryLight,
    },
    label: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
  });
