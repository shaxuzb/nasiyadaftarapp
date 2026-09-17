import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useThemeContext } from "../context/ThemeContext";
import { useTranslation } from "../i18n";
import { radius, spacing, typography } from "../theme";

interface Props {
  variant: "signIn" | "signUp";
  loading?: boolean;
  onPress: () => void;
}

export function AppleAuthButton({ variant, loading = false, onPress }: Props) {
  const { theme, resolvedScheme } = useThemeContext();
  const { t } = useTranslation();
  const label =
    variant === "signUp"
      ? t("auth.register.appleSignUp")
      : t("auth.login.appleSignIn");
  const isDark = resolvedScheme === "dark";
  const buttonBackground = isDark ? theme.inputBackground : theme.text;
  const buttonTextColor = isDark ? theme.text : "#fff";

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={loading ? t("auth.appleSigningIn") : label}
        accessibilityState={{
          disabled: loading,
          busy: loading,
        }}
        disabled={loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: buttonBackground,
            borderColor: isDark ? theme.border : theme.text,
            opacity: loading ? 0.72 : pressed ? 0.84 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={buttonTextColor} />
        ) : (
          <>
            <Ionicons name="logo-apple" size={19} color={buttonTextColor} />
            <Text style={[typography.label, styles.label, { color: buttonTextColor }]}>
              {label}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: spacing.sm,
  },
  button: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "500",
  },
});
