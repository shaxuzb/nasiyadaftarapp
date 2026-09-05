import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppInput } from "../components/AppInput";
import { OtpInput } from "../components/OtpInput";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  confirmGoogleChange,
  confirmPasswordChange,
  requestGoogleChange,
  requestPasswordChange,
} from "../modules/account/services/accountService";
import { PasswordDelivery } from "../modules/account/types";
import {
  getGoogleSignInErrorMessage,
  getGoogleEmailFromIdToken,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useTheme } from "../hooks/useTheme";
import { AppTheme, RootStackParamList } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { useAppLock } from "@/modules/pin-auth/context/AppLockContext";

type Props = NativeStackScreenProps<RootStackParamList, "AccountSecurity">;
type PasswordStep = "idle" | "request" | "confirm";
type GoogleStep = "idle" | "confirm";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const OTP_LENGTH = 6;

interface ActionRowProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  description: string;
  onPress: () => void;
  isLast?: boolean;
  loading?: boolean;
}

function ActionRow({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  onPress,
  isLast,
  loading,
}: ActionRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription} numberOfLines={2}>
          {description}
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      )}
    </Pressable>
  );
}

interface ToggleRowProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  description: string;
  value: boolean;
  disabled?: boolean;
  onPress: () => void;
  isLast?: boolean;
}

function ToggleRow({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  value,
  disabled,
  onPress,
  isLast,
}: ToggleRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={title}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        !isLast && styles.rowBorder,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <View style={[styles.actionIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={19} color={iconColor} />
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDescription} numberOfLines={2}>{description}</Text>
      </View>
      <View style={[styles.toggleTrack, value && { backgroundColor: theme.primary }, disabled && styles.disabled]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </Pressable>
  );
}

export function AccountSecurityScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, updateUserProfile } = useAuth();
  const {
    pinEnabled,
    biometric,
    biometricEnabled,
    setBiometricEnabled,
    removePin,
    startPinSetup,
    lockNow,
  } = useAppLock();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();

  const [passwordStep, setPasswordStep] = useState<PasswordStep>("idle");
  const [passwordDelivery, setPasswordDelivery] =
    useState<PasswordDelivery>("SMS");
  const [passwordCode, setPasswordCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [googleStep, setGoogleStep] = useState<GoogleStep>("idle");
  const [googleCode, setGoogleCode] = useState("");
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const hasPhone = Boolean(user?.phoneNumber?.trim());
  const hasEmail = Boolean(user?.email?.trim());
  const canUseSms = hasPhone;
  const canUseEmail = hasEmail;

  const handlePinRemove = useCallback(async () => {
    const accepted = await confirm({
      title: "PIN-kodni o‘chirish",
      message: "PIN login va biometrik kirish o‘chiriladi. Keyin istalgan vaqtda yangi PIN o‘rnatishingiz mumkin.",
      confirmText: "O‘chirish",
      cancelText: "Bekor qilish",
      variant: "danger",
    });
    if (!accepted) return;
    const result = await removePin();
    showToast(
      result.success ? "PIN-kod o‘chirildi" : result.message ?? "PIN-kodni o‘chirib bo‘lmadi",
      result.success ? "success" : "error",
    );
  }, [confirm, removePin, showToast]);

  const resetPasswordChange = useCallback(() => {
    setPasswordStep("idle");
    setPasswordCode("");
    setNewPassword("");
  }, []);

  const handlePasswordRequest = useCallback(async () => {
    if (!canUseSms && !canUseEmail) {
      showToast("Avval telefon raqami yoki emailni biriktiring", "error");
      return;
    }

    const delivery = canUseSms ? passwordDelivery : "EMAIL";
    setPasswordLoading(true);
    try {
      await requestPasswordChange({ delivery });
      setPasswordDelivery(delivery);
      setPasswordStep("confirm");
      showToast("Tasdiqlash kodi yuborildi", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Kod yuborib bo'lmadi"), "error");
    } finally {
      setPasswordLoading(false);
    }
  }, [canUseEmail, canUseSms, passwordDelivery, showToast]);

  const handlePasswordConfirm = useCallback(async () => {
    if (passwordCode.length !== OTP_LENGTH) {
      showToast("6 xonali tasdiqlash kodini kiriting", "error");
      return;
    }
    if (newPassword.trim().length < 8) {
      showToast("Yangi parol kamida 8 ta belgidan iborat bo'lsin", "error");
      return;
    }

    setPasswordLoading(true);
    try {
      await confirmPasswordChange({
        delivery: passwordDelivery,
        code: passwordCode,
        newPassword,
      });
      resetPasswordChange();
      showToast("Parol muvaffaqiyatli yangilandi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Parolni yangilab bo'lmadi"),
        "error",
      );
    } finally {
      setPasswordLoading(false);
    }
  }, [newPassword, passwordCode, passwordDelivery, resetPasswordChange, showToast]);

  const resetGoogleChange = useCallback(() => {
    setGoogleStep("idle");
    setGoogleCode("");
    setGoogleIdToken("");
  }, []);

  const handleGoogleRequest = useCallback(async () => {
    setGoogleLoading(true);
    try {
      const idToken = await requestGoogleIdToken();
      await requestGoogleChange({ idToken });
      setGoogleIdToken(idToken);
      setGoogleStep("confirm");
      showToast("Yangi Google akkauntiga tasdiqlash kodi yuborildi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, getGoogleSignInErrorMessage(error)),
        "error",
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [showToast]);

  const handleGoogleConfirm = useCallback(async () => {
    if (googleCode.length !== OTP_LENGTH) {
      showToast("6 xonali tasdiqlash kodini kiriting", "error");
      return;
    }

    setGoogleLoading(true);
    try {
      const response = await confirmGoogleChange({
        idToken: googleIdToken,
        code: googleCode,
      });
      const confirmedEmail =
        response?.user?.email ??
        response?.email ??
        getGoogleEmailFromIdToken(googleIdToken);
      await updateUserProfile({ email: confirmedEmail ?? user?.email ?? null });
      resetGoogleChange();
      showToast("Google akkaunti yangilandi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Google akkauntni yangilab bo'lmadi"),
        "error",
      );
    } finally {
      setGoogleLoading(false);
    }
  }, [
    googleCode,
    googleIdToken,
    resetGoogleChange,
    showToast,
    updateUserProfile,
    user?.email,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orqaga qaytish"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>Kirish va xavfsizlik</Text>
          <Text style={styles.screenSubtitle}>
            Parol va bog'langan akkauntingizni boshqaring
          </Text>
        </View>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.summaryCopy}>
            <Text style={styles.summaryTitle}>Kirish ma'lumotlaringiz</Text>
            <Text style={styles.summaryDescription}>
              O'zgarishlar SMS yoki email kodi orqali xavfsiz tasdiqlanadi.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>PIN-kod va biometrika</Text>
        <View style={styles.card}>
          {pinEnabled ? (
            <>
              <ToggleRow
                icon={biometric?.icon ?? "finger-print-outline"}
                iconColor={theme.primary}
                iconBackground={theme.primaryLight}
                title={biometric?.label ?? "Biometrik kirish"}
                description={
                  biometric?.available
                    ? "Ilovaga Face ID, Touch ID yoki barmoq izi bilan kiring"
                    : "Bu qurilmada biometrik kirish mavjud emas"
                }
                value={biometricEnabled}
                disabled={!biometric?.available || biometricLoading}
                onPress={() => {
                  setBiometricLoading(true);
                  void setBiometricEnabled(!biometricEnabled)
                    .then((result) => {
                      if (!result.success) showToast(result.message ?? "Biometrikani o‘zgartirib bo‘lmadi", "error");
                      else showToast(biometricEnabled ? "Biometrik kirish o‘chirildi" : "Biometrik kirish yoqildi", "success");
                    })
                    .finally(() => setBiometricLoading(false));
                }}
              />
              <ActionRow
                icon="create-outline"
                iconColor={theme.primary}
                iconBackground={theme.inputBackground}
                title="PIN-kodni o'zgartirish"
                description="Amaldagi PIN-kodni tasdiqlab, yangisini o'rnating"
                onPress={() => navigation.navigate("PinChange")}
              />
              <ActionRow
                icon="trash-outline"
                iconColor={theme.dangerColor}
                iconBackground={theme.debtBg}
                title="PIN-kodni o‘chirish"
                description="PIN login va biometrik kirishni o‘chiradi"
                onPress={handlePinRemove}
                isLast
              />
            </>
          ) : (
            <ActionRow
              icon="key-outline"
              iconColor={theme.primary}
              iconBackground={theme.primaryLight}
              title="PIN-kodni o‘rnatish"
              description="Ilovaga tez va xavfsiz kirish uchun 4 xonali PIN yarating"
              onPress={startPinSetup}
              isLast
            />
          )}
        </View>

        <Text style={styles.sectionTitle}>Parol va akkauntlar</Text>
        <View style={styles.card}>
          <ActionRow
            icon="lock-closed-outline"
            iconColor={theme.warningColor}
            iconBackground={theme.inputBackground}
            title="Parolni o'zgartirish"
            description="SMS yoki emaildagi kod bilan tasdiqlanadi"
            onPress={() => {
              setPasswordStep("request");
            }}
            loading={passwordLoading && passwordStep === "idle"}
          />
          <ActionRow
            icon="logo-google"
            iconColor={theme.dangerColor}
            iconBackground={theme.debtBg}
            title="Google akkaunt va email"
            description={
              hasEmail
                ? user?.email ?? "Bog'langan Google akkaunt"
                : "Google akkauntini tanlab, emailni biriktiring"
            }
            onPress={() => {
              void handleGoogleRequest();
            }}
            loading={googleLoading && googleStep === "idle"}
          />
          <ActionRow
            icon="lock-closed-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title="Ilovani qulflash"
            description="PIN yoki biometrika bilan qayta ochiladi"
            onPress={lockNow}
            isLast
          />
        </View>

        {passwordStep === "request" ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons name="lock-closed-outline" size={19} color={theme.primary} />
              </View>
              <View style={styles.formCopy}>
                <Text style={styles.formTitle}>Tasdiqlash usulini tanlang</Text>
                <Text style={styles.formDescription}>
                  Kod yangi parolni saqlashdan oldin yuboriladi.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Parolni o'zgartirishni bekor qilish"
                onPress={resetPasswordChange}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            {(canUseSms && canUseEmail) ? (
              <View style={styles.deliveryRow}>
                {(["SMS", "EMAIL"] as const).map((delivery) => {
                  const active = passwordDelivery === delivery;
                  return (
                    <Pressable
                      key={delivery}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      onPress={() => setPasswordDelivery(delivery)}
                      style={[styles.deliveryOption, active && styles.deliveryOptionActive]}
                    >
                      <Text style={[styles.deliveryText, active && styles.deliveryTextActive]}>
                        {delivery === "SMS" ? "SMS" : "Email"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.formDescription}>
                Kod {canUseSms ? "SMS" : "email"} orqali yuboriladi.
              </Text>
            )}
            <PrimaryButton
              label="Kod yuborish"
              onPress={() => {
                void handlePasswordRequest();
              }}
              loading={passwordLoading}
              disabled={passwordLoading}
            />
          </View>
        ) : null}

        {passwordStep === "confirm" ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons name="key-outline" size={19} color={theme.primary} />
              </View>
              <View style={styles.formCopy}>
                <Text style={styles.formTitle}>Yangi parol</Text>
                <Text style={styles.formDescription}>
                  Kod {passwordDelivery === "SMS" ? "SMS" : "email"} orqali yuborildi.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Parolni o'zgartirishni bekor qilish"
                onPress={resetPasswordChange}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            <AppInput
              label="Yangi parol"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Kamida 8 ta belgi"
              iconName="lock-closed-outline"
              secureTextEntry
              passwordToggle
              autoComplete="new-password"
            />
            <Text style={styles.codeLabel}>Tasdiqlash kodi</Text>
            <OtpInput value={passwordCode} onChange={setPasswordCode} length={OTP_LENGTH} />
            <PrimaryButton
              label="Parolni yangilash"
              onPress={() => {
                void handlePasswordConfirm();
              }}
              loading={passwordLoading}
              disabled={passwordLoading}
            />
          </View>
        ) : null}

        {googleStep === "confirm" ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formIcon}>
                <Ionicons name="logo-google" size={19} color={theme.dangerColor} />
              </View>
              <View style={styles.formCopy}>
                <Text style={styles.formTitle}>Google akkauntni tasdiqlang</Text>
                <Text style={styles.formDescription}>
                  Tanlangan Google akkauntiga yuborilgan kodni kiriting.
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Google akkauntni o'zgartirishni bekor qilish"
                onPress={resetGoogleChange}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={20} color={theme.textMuted} />
              </Pressable>
            </View>
            <OtpInput value={googleCode} onChange={setGoogleCode} length={OTP_LENGTH} autoFocus />
            <PrimaryButton
              label="Google akkauntni tasdiqlash"
              onPress={() => {
                void handleGoogleConfirm();
              }}
              loading={googleLoading}
              disabled={googleLoading}
            />
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surface,
    },
    headerCopy: { minWidth: 0, flex: 1, gap: 2 },
    screenTitle: { color: theme.text, fontSize: 22, lineHeight: 28, fontWeight: "800" },
    screenSubtitle: { color: theme.textSecondary, fontSize: 12, lineHeight: 17 },
    content: { paddingHorizontal: 16, paddingBottom: 28, gap: 12 },
    summaryCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    summaryIcon: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },
    summaryCopy: { minWidth: 0, flex: 1, gap: 2 },
    summaryTitle: { color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: "800" },
    summaryDescription: { color: theme.textSecondary, fontSize: 11, lineHeight: 16 },
    sectionTitle: {
      marginTop: 4,
      color: theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
    },
    card: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    actionRow: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 13,
      paddingVertical: 10,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    actionIcon: {
      width: 40,
      height: 40,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
    },
    actionCopy: { minWidth: 0, flex: 1, gap: 2 },
    actionTitle: { color: theme.text, fontSize: 13, lineHeight: 18, fontWeight: "800" },
    actionDescription: { color: theme.textMuted, fontSize: 10, lineHeight: 14 },
    toggleTrack: {
      width: 48,
      height: 28,
      padding: 3,
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.border,
    },
    toggleThumb: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    toggleThumbActive: { alignSelf: "flex-end" },
    formCard: {
      gap: 12,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 18,
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    formHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
    formIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
    formCopy: { minWidth: 0, flex: 1, gap: 1 },
    formTitle: { color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: "800" },
    formDescription: { color: theme.textMuted, fontSize: 10, lineHeight: 14 },
    closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
    deliveryRow: { flexDirection: "row", gap: 8 },
    deliveryOption: {
      minHeight: 38,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
    },
    deliveryOptionActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    deliveryText: { color: theme.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: "700" },
    deliveryTextActive: { color: theme.primary },
    codeLabel: { color: theme.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: "700" },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.58 },
  });
