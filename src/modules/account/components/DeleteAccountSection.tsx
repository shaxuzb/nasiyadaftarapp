import React, { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../../../context/AuthContext";
import { useConfirmDialog } from "../../../context/ConfirmDialogContext";
import { useToast } from "../../../context/ToastContext";
import { queryClient } from "../../../core/query/queryClient";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { clearPaymentLifecycleForUser } from "../../payments/services/paymentStorage";
import { clearAuthSession } from "../../../services/authStorage";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { useAppLock } from "../../pin-auth/context/AppLockContext";
import { SensitiveActionReauthModal } from "../../pin-auth/components/SensitiveActionReauthModal";
import { pinStorage } from "../../pin-auth/services/pinStorage";
import { deleteMyAccount } from "../services/accountDeletionService";

const COPY = {
  uz: {
    section: "Xavfli amallar",
    title: "Akkauntni o‘chirish",
    description: "Akkauntga kirish yopiladi. Bu amalni ehtiyotkorlik bilan bajaring.",
    confirmTitle: "Akkauntni o‘chirasizmi?",
    confirmMessage:
      "Akkaunt o‘chirilgandan keyin ushbu qurilmadagi sessiya va PIN ma’lumotlari ham tozalanadi.",
    reauthTitle: "Shaxsingizni tasdiqlang",
    reauthDescription: "Akkauntni o‘chirishdan oldin PIN yoki biometrika bilan tasdiqlang.",
    invalidPin: "PIN-kod noto‘g‘ri. {count} urinish qoldi.",
    error: "Akkauntni o‘chirib bo‘lmadi",
  },
  ru: {
    section: "Опасные действия",
    title: "Удалить аккаунт",
    description: "Доступ к аккаунту будет закрыт. Выполняйте это действие внимательно.",
    confirmTitle: "Удалить аккаунт?",
    confirmMessage:
      "После удаления аккаунта с этого устройства также будут удалены сессия и данные PIN-кода.",
    reauthTitle: "Подтвердите личность",
    reauthDescription: "Перед удалением аккаунта подтвердите действие PIN-кодом или биометрией.",
    invalidPin: "Неверный PIN-код. Осталось попыток: {count}.",
    error: "Не удалось удалить аккаунт",
  },
} as const;

export function DeleteAccountSection() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const copy = COPY[locale === "ru" ? "ru" : "uz"];
  const { user, logout } = useAuth();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const {
    pinEnabled,
    biometric,
    biometricEnabled,
    submitUnlockPin,
    unlockWithBiometrics,
  } = useAppLock();

  const [reauthVisible, setReauthVisible] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const finalizeDeletion = useCallback(async () => {
    const userId = user?.id ?? null;
    await deleteMyAccount();

    if (userId) {
      await clearPaymentLifecycleForUser(userId).catch(() => undefined);
      try {
        await Promise.all([
          pinStorage.clearPin(userId),
          pinStorage.clearPinSetupState(userId),
        ]);
      } catch {
        // Account deletion must still clear the auth session if local PIN cleanup fails.
      }
    }

    queryClient.clear();
    await clearAuthSession();
    await logout();
  }, [logout, user?.id]);

  const executeDeletion = useCallback(async () => {
    setSubmitting(true);
    setReauthError(null);
    try {
      await finalizeDeletion();
      setReauthVisible(false);
    } catch {
      showToast(copy.error, "error");
    } finally {
      setSubmitting(false);
    }
  }, [copy.error, finalizeDeletion, showToast]);

  const handleBiometric = useCallback(async () => {
    setSubmitting(true);
    setReauthError(null);
    try {
      const authorized = await unlockWithBiometrics();
      if (authorized) {
        await finalizeDeletion();
        setReauthVisible(false);
      } else {
        setReauthVisible(true);
      }
    } catch {
      setReauthVisible(true);
    } finally {
      setSubmitting(false);
    }
  }, [finalizeDeletion, unlockWithBiometrics]);

  const beginDeletion = useCallback(async () => {
    const accepted = await confirm({
      title: copy.confirmTitle,
      message: copy.confirmMessage,
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
      variant: "danger",
    });
    if (!accepted) return;

    if (!pinEnabled) {
      await executeDeletion();
      return;
    }

    if (biometricEnabled && biometric?.available) {
      await handleBiometric();
      return;
    }

    setReauthError(null);
    setReauthVisible(true);
  }, [
    biometric?.available,
    biometricEnabled,
    confirm,
    copy.confirmMessage,
    copy.confirmTitle,
    executeDeletion,
    handleBiometric,
    pinEnabled,
    t,
  ]);

  const handlePin = useCallback(
    async (pin: string) => {
      setSubmitting(true);
      setReauthError(null);
      try {
        const result = await submitUnlockPin(pin);
        if (result.status === "unlocked") {
          await finalizeDeletion();
          setReauthVisible(false);
          return;
        }
        if (result.status === "logged-out") {
          setReauthVisible(false);
          return;
        }
        setReauthError(
          copy.invalidPin.replace("{count}", String(result.attemptsRemaining)),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [copy.invalidPin, finalizeDeletion, submitUnlockPin],
  );

  return (
    <>
      <Text style={styles.sectionTitle}>{copy.section}</Text>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.title}
          disabled={submitting}
          onPress={() => void beginDeletion()}
          style={({ pressed }) => [
            styles.row,
            pressed && styles.pressed,
            submitting && styles.disabled,
          ]}
        >
          <View style={styles.icon}>
            <Ionicons name="trash-outline" size={20} color={theme.dangerColor} />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.description}>{copy.description}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        </Pressable>
      </View>

      <SensitiveActionReauthModal
        visible={reauthVisible}
        title={copy.reauthTitle}
        description={copy.reauthDescription}
        biometricAvailable={Boolean(biometricEnabled && biometric?.available)}
        biometricLabel={biometric?.label}
        submitting={submitting}
        errorMessage={reauthError}
        onBiometric={() => void handleBiometric()}
        onSubmitPin={(pin) => void handlePin(pin)}
        onCancel={() => {
          if (submitting) return;
          setReauthError(null);
          setReauthVisible(false);
        }}
      />
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sectionTitle: {
      ...typography.headingSmall,
      color: theme.dangerColor,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
    },
    card: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.debtBg,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
    },
    row: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: spacing.sm,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.debtBg,
    },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    title: { ...typography.label, color: theme.dangerColor, fontWeight: "800" },
    description: { ...typography.caption, color: theme.textSecondary },
    pressed: { opacity: 0.7 },
    disabled: { opacity: 0.5 },
  });