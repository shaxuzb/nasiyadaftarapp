import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useBottomSheet } from "../bottom-sheet";
import { useTranslation } from "../i18n";
import { radius, spacing, typography } from "../theme";
import { useTheme } from "../hooks/useTheme";
import { flagOf } from "../modules/phone/utils/phoneNumber";
import { getSetupLanguage } from "../modules/setup/data/setupOptions";

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
        {/* The language in use, by its flag, as in the profile. */}
        <Text style={styles.flag}>{flagOf(getSetupLanguage(locale).flag)}</Text>
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
    flag: { fontSize: 17, lineHeight: 22 },
    pressed: { opacity: 0.72 },
  });
