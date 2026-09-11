import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { requestPasswordReset } from "../services/authApi";
import { useToast } from "../context/ToastContext";
import { APP_NAME } from "../constants";
import { toStoredUzPhone, uzPhoneMask, isValidUzPhone } from "../utils/masks";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import { useTranslation } from "../i18n";

interface Props {
  onGoBackToLogin: () => void;
  onGoToConfirm: (phone: string) => void;
}

export function PasswordResetRequestScreen({
  onGoBackToLogin,
  onGoToConfirm,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [phone, setPhone] = useState("+998 ");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => isValidUzPhone(phone), [phone]);

  const handleRequest = async () => {
    if (!canSubmit) {
      showToast(t("auth.passwordReset.phoneError"), "error");
      return;
    }

    const normalizedPhone = toStoredUzPhone(phone);
    setLoading(true);
    try {
      await requestPasswordReset({ phone: normalizedPhone });
      showToast(t("auth.register.smsSent"), "success");
      onGoToConfirm(normalizedPhone);
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "auth.passwordReset.userNotFound", t),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.scrollContent}>
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior="padding">
        <View style={styles.wrapper}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <View style={styles.headerWrap}>
              <View
                style={[
                  styles.logoWrap,
                  { backgroundColor: theme.primaryLight },
                ]}
              >
                <Ionicons
                  name="lock-open-outline"
                  size={28}
                  color={theme.primary}
                />
              </View>
              <Text style={[typography.headingLarge, { color: theme.text }]}>
                {t("auth.passwordReset.title")}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                {t("auth.passwordReset.description", { appName: APP_NAME })}
              </Text>
            </View>

            <AppInput
              label={t("auth.passwordReset.phoneLabel")}
              uncontrolled
              defaultValue={phone}
              onChangeText={setPhone}
              placeholder={t("auth.register.phonePlaceholder")}
              iconName="call-outline"
              keyboardType="phone-pad"
              mask={uzPhoneMask}
            />

            <PrimaryButton
              label={t("auth.passwordReset.sendCode")}
              onPress={handleRequest}
              loading={loading}
              disabled={!canSubmit}
              style={{ marginTop: spacing.xs }}
            />

            <TouchableOpacity
              onPress={onGoBackToLogin}
              style={styles.footerBtn}
            >
              <Text style={[typography.label, { color: theme.primary }]}>
                {t("auth.passwordReset.backToLogin")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logoWrap: {
    width: 62,
    height: 62,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  desc: {
    textAlign: "center",
    marginTop: spacing.xs,
  },
  footerBtn: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
});
