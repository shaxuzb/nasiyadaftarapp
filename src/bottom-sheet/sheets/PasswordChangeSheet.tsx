import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppInput } from "../../components/AppInput";
import { OtpInput } from "../../components/OtpInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getLocalizedApiErrorMessage, useTranslation } from "../../i18n";
import { useOtpAutoFill } from "../../modules/auth/hooks/useOtpAutoFill";
import {
  confirmPasswordChange,
  requestPasswordChange,
} from "../../modules/account/services/accountService";
import type { PasswordDelivery } from "../../modules/account/types";
import { useTheme } from "../../hooks/useTheme";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";
import { AndroidSheetKeyboardBridge } from "../AndroidSheetKeyboardBridge";
import type { SheetRenderProps } from "../types";

const OTP_LENGTH = 6;

function PasswordSmsAutoFill({
  onCodeReceived,
}: {
  onCodeReceived: (code: string) => void;
}) {
  useOtpAutoFill({ onCodeReceived });
  return null;
}

export function PasswordChangeSheet({
  closeSheet,
  setDismissLocked,
}: SheetRenderProps<"passwordChange">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<"request" | "confirm">("request");
  const [delivery, setDelivery] = useState<PasswordDelivery>("SMS");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const canUseSms = Boolean(user?.phoneNumber?.trim());
  const canUseEmail = Boolean(user?.email?.trim());
  const activeDelivery: PasswordDelivery = canUseSms ? delivery : "EMAIL";

  useEffect(() => {
    if (!canUseSms && canUseEmail) setDelivery("EMAIL");
  }, [canUseEmail, canUseSms]);

  useEffect(() => {
    setDismissLocked(loading);
    return () => setDismissLocked(false);
  }, [loading, setDismissLocked]);

  const close = () => {
    if (loading) return;
    Keyboard.dismiss();
    closeSheet();
  };

  const requestCode = async () => {
    if (!canUseSms && !canUseEmail) {
      showToast(t("security.linkAccountFirst"), "error");
      return;
    }

    setLoading(true);
    try {
      await requestPasswordChange({ delivery: activeDelivery });
      setCode("");
      setNewPassword("");
      setStep("confirm");
      showToast(t("security.codeSent"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "security.codeSendError", t),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmChange = async () => {
    if (code.length !== OTP_LENGTH) {
      showToast(t("security.otpRequired"), "error");
      return;
    }
    if (newPassword.trim().length < 8) {
      showToast(t("security.passwordMinLength"), "error");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordChange({
        delivery: activeDelivery,
        code,
        newPassword: newPassword.trim(),
      });
      Keyboard.dismiss();
      setDismissLocked(false);
      closeSheet(() => showToast(t("security.passwordUpdated"), "success"));
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "security.passwordUpdateError", t),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <BottomSheetScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.md },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <AndroidSheetKeyboardBridge />

      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="lock-closed-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("security.passwordChange")}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {t("security.passwordDescription")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          disabled={loading}
          onPress={close}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
        >
          <Ionicons name="close" size={21} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.stepIndicator}>
        <View
          style={[styles.stepDot, step === "request" && styles.stepDotActive]}
        />
        <View
          style={[styles.stepLine, step === "confirm" && styles.stepLineActive]}
        />
        <View
          style={[styles.stepDot, step === "confirm" && styles.stepDotActive]}
        />
      </View>

      {step === "request" ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("security.chooseDelivery")}</Text>
          <Text style={styles.sectionDescription}>
            {t("security.deliveryDescription")}
          </Text>

          {canUseSms && canUseEmail ? (
            <View style={styles.deliveryRow}>
              {(["SMS", "EMAIL"] as const).map((item) => {
                const selected = delivery === item;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setDelivery(item)}
                    style={({ pressed }) => [
                      styles.deliveryOption,
                      selected && styles.deliveryOptionActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name={item === "SMS" ? "chatbubble-outline" : "mail-outline"}
                      size={18}
                      color={selected ? theme.primary : theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.deliveryText,
                        selected && styles.deliveryTextActive,
                      ]}
                    >
                      {item === "SMS" ? "SMS" : t("profile.email")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : canUseSms || canUseEmail ? (
            <View style={styles.deliverySummary}>
              <Ionicons
                name={activeDelivery === "SMS" ? "chatbubble-outline" : "mail-outline"}
                size={18}
                color={theme.primary}
              />
              <Text style={styles.deliverySummaryText}>
                {t("security.codeDelivery", {
                  channel: activeDelivery === "SMS" ? "SMS" : t("profile.email"),
                })}
              </Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="alert-circle-outline"
                size={19}
                color={theme.warningColor}
              />
              <Text style={styles.sectionDescription}>
                {t("security.linkAccountFirst")}
              </Text>
            </View>
          )}

          <PrimaryButton
            label={t("security.sendCode")}
            onPress={() => void requestCode()}
            loading={loading}
            disabled={loading || (!canUseSms && !canUseEmail)}
          />
        </View>
      ) : (
        <View style={styles.section}>
          {activeDelivery === "SMS" ? (
            <PasswordSmsAutoFill onCodeReceived={setCode} />
          ) : null}
          <Text style={styles.sectionTitle}>{t("security.newPassword")}</Text>
          <Text style={styles.sectionDescription}>
            {t("security.codeDelivery", {
              channel: activeDelivery === "SMS" ? "SMS" : t("profile.email"),
            })}
          </Text>
          <Text style={styles.fieldLabel}>{t("security.verificationCode")}</Text>
          <OtpInput value={code} onChange={setCode} autoFocus />
          <AppInput
            variant="sheet"
            label={t("security.newPassword")}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("security.passwordPlaceholder")}
            iconName="key-outline"
            secureTextEntry
            passwordToggle
            autoComplete="new-password"
            returnKeyType="done"
          />
          <PrimaryButton
            label={t("security.updatePassword")}
            onPress={() => void confirmChange()}
            loading={loading}
            disabled={loading}
          />
        </View>
      )}
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scroll: { flexGrow: 0 },
    content: {
      paddingHorizontal: 16,
      paddingTop: 4,
      gap: 12,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },
    headerCopy: { flex: 1, minWidth: 0, gap: 2 },
    title: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
    },
    description: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.inputBackground,
    },
    stepIndicator: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 6,
      paddingVertical: 2,
    },
    stepDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.border,
    },
    stepDotActive: { backgroundColor: theme.primary },
    stepLine: {
      width: 34,
      height: 2,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    stepLineActive: { backgroundColor: theme.primary },
    section: {
      gap: 10,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.lg,
      backgroundColor: theme.surfaceElevated,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
    },
    sectionDescription: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    deliveryRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 2,
    },
    deliveryOption: {
      minHeight: 48,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    deliveryOptionActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    deliveryText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    deliveryTextActive: { color: theme.primary },
    deliverySummary: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    deliverySummaryText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    emptyState: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    fieldLabel: {
      marginTop: 2,
      color: theme.textSecondary,
      ...typography.label,
    },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.56 },
  });
