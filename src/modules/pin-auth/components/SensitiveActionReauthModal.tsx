import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { useTranslation } from "../../../i18n";

export interface SensitiveActionReauthModalProps {
  visible: boolean;
  title: string;
  description?: string;
  biometricAvailable: boolean;
  biometricLabel?: string;
  submitting?: boolean;
  errorMessage?: string | null;
  onBiometric(): void;
  onSubmitPin(pin: string): void;
  onCancel(): void;
}

export function SensitiveActionReauthModal({
  visible,
  title,
  description,
  biometricAvailable,
  biometricLabel,
  submitting = false,
  errorMessage,
  onBiometric,
  onSubmitPin,
  onCancel,
}: SensitiveActionReauthModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!visible) setPin("");
  }, [visible]);

  const canSubmit = /^\d{4}$/.test(pin) && !submitting;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!submitting) onCancel();
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          {biometricAvailable ? (
            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={onBiometric}
              style={({ pressed }) => [
                styles.biometricButton,
                pressed && styles.pressed,
                submitting && styles.disabled,
              ]}
            >
              <Ionicons name="finger-print-outline" size={20} color={theme.primary} />
              <Text style={styles.biometricText}>
                {biometricLabel ?? t("security.biometric")}
              </Text>
            </Pressable>
          ) : null}

          <View style={styles.pinField}>
            <Text style={styles.pinLabel}>{t("security.currentPin")}</Text>
            <TextInput
              value={pin}
              onChangeText={(value) => setPin(value.replace(/\D/g, "").slice(0, 4))}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              editable={!submitting}
              autoFocus={!biometricAvailable}
              textContentType="password"
              style={styles.pinInput}
              onSubmitEditing={() => {
                if (canSubmit) onSubmitPin(pin);
              }}
            />
            {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={() => onSubmitPin(pin)}
            style={({ pressed }) => [
              styles.confirmButton,
              !canSubmit && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.confirmText}>{t("common.confirm")}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={submitting}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
          >
            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "center",
      padding: spacing.lg,
      backgroundColor: "rgba(0,0,0,0.48)",
    },
    card: {
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      padding: spacing.lg,
      gap: spacing.sm,
      boxShadow: theme.cardShadow,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
      marginBottom: spacing.xs,
    },
    title: { ...typography.headingMedium, color: theme.text },
    description: { ...typography.bodySmall, color: theme.textSecondary },
    biometricButton: {
      minHeight: 48,
      marginTop: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    biometricText: { ...typography.label, color: theme.text },
    pinField: { gap: spacing.xs, marginTop: spacing.xs },
    pinLabel: { ...typography.labelSmall, color: theme.textSecondary },
    pinInput: {
      minHeight: 50,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      fontSize: 22,
      letterSpacing: 12,
      textAlign: "center",
      paddingHorizontal: spacing.md,
    },
    error: { ...typography.caption, color: theme.dangerColor },
    confirmButton: {
      minHeight: 48,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      marginTop: spacing.xs,
    },
    confirmText: { ...typography.label, color: theme.onPrimary, fontWeight: "800" },
    cancelButton: { minHeight: 44, alignItems: "center", justifyContent: "center" },
    cancelText: { ...typography.label, color: theme.textSecondary },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.5 },
  });
