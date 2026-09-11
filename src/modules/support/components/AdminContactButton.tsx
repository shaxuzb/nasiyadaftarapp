import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import { radius, spacing, typography } from "../../../theme";
import { AppTheme } from "../../../types";
import { useAdminContact } from "../hooks/useAdminContact";
import { useTranslation } from "../../../i18n";

interface AdminContactButtonProps {
  variant?: "compact" | "card";
  style?: StyleProp<ViewStyle>;
}

export const AdminContactButton = React.memo(function AdminContactButton({
  variant = "compact",
  style,
}: AdminContactButtonProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isOpening, openAdminContact } = useAdminContact();
  const isCard = variant === "card";

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t("common.adminContact")}
      accessibilityHint={t("common.adminContactHint")}
      accessibilityState={{ disabled: isOpening, busy: isOpening }}
      disabled={isOpening}
      onPress={() => {
        void openAdminContact();
      }}
      style={({ pressed }) => [
        styles.base,
        isCard ? styles.card : styles.compact,
        pressed && styles.pressed,
        isOpening && styles.disabled,
        style,
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          isCard ? styles.cardIconWrap : styles.compactIconWrap,
        ]}
      >
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={isCard ? 21 : 18}
          color={theme.primary}
        />
      </View>
      <View style={[styles.copy, !isCard && styles.compactCopy]}>
        <Text
          style={[styles.title, !isCard && styles.compactTitle]}
          numberOfLines={1}
        >
          {t("common.adminContactTitle")}
        </Text>
        {isCard ? (
          <Text style={styles.description} numberOfLines={1}>
            {t("common.adminContactDescription")}
          </Text>
        ) : null}
      </View>
      {isOpening ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : isCard ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.textMuted}
        />
      ) : null}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    base: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
    },
    compact: {
      minHeight: 44,
      alignSelf: "center",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderWidth: 0,
      borderRadius: radius.full,
      backgroundColor: "transparent",
    },
    card: {
      minHeight: 60,
      paddingHorizontal: 13,
      paddingVertical: spacing.sm,
      borderRadius: radius.lg,
      boxShadow: theme.cardShadow,
    },
    iconWrap: {
      width: 30,
      height: 30,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      borderCurve: "continuous",
      backgroundColor: theme.primaryLight,
    },
    cardIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
    },
    compactIconWrap: {
      width: 24,
      height: 24,
      borderRadius: radius.full,
      backgroundColor: "transparent",
    },
    copy: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    compactCopy: {
      flex: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    title: {
      ...typography.label,
      color: theme.text,
      fontWeight: "700",
    },
    compactTitle: {
      color: theme.primary,
    },
    description: {
      ...typography.caption,
      color: theme.textMuted,
    },
    pressed: {
      opacity: 0.7,
      backgroundColor: theme.inputBackground,
    },
    disabled: {
      opacity: 0.58,
    },
  });
