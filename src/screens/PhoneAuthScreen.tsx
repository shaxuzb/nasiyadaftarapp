import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { AdminContactButton } from "../modules/support/components/AdminContactButton";
import { AppleAuthButton } from "../components/AppleAuthButton";
import { AppInput } from "../components/AppInput";
import { LanguageSelectorButton } from "../components/LanguageSelectorButton";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../i18n";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import {
  AppleSignInFlowError,
  isAppleSignInAvailable,
  requestAppleCredential,
} from "../modules/auth/services/appleSignInService";
import {
  getGoogleSignInErrorKey,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import { requestPhoneAuthCode } from "../services/authApi";
import { useTheme } from "../hooks/useTheme";
import { APP_NAME } from "../constants";
import { radius, spacing, typography } from "../theme";
import {
  formatUzPhoneFromDigits,
  isValidUzPhone,
  toStoredUzPhone,
  uzPhoneMask,
} from "../utils/masks";

interface Props {
  onGoToVerify: (params: {
    phoneNumber: string;
    maskedPhone: string;
    expiresInSeconds: number;
  }) => void;
}

export function PhoneAuthScreen({ onGoToVerify }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { loginWithGoogleIdToken, loginWithAppleCredential } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("+998 ");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const canSubmit = useMemo(
    () => isValidUzPhone(phoneNumber) && !loading,
    [loading, phoneNumber],
  );

  useEffect(() => {
    let active = true;
    if (Platform.OS !== "ios") return undefined;

    void isAppleSignInAvailable()
      .then((available) => {
        if (active) setAppleAvailable(available);
      })
      .catch(() => {
        if (active) setAppleAvailable(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(value);
  }, []);

  const handleRequestCode = useCallback(async () => {
    if (!isValidUzPhone(phoneNumber)) {
      showToast(t("auth.phoneAuth.phoneError"), "error");
      return;
    }

    const normalizedPhone = toStoredUzPhone(phoneNumber);
    setLoading(true);
    try {
      const response = await requestPhoneAuthCode({
        phoneNumber: normalizedPhone,
      });
      onGoToVerify({
        phoneNumber: normalizedPhone,
        maskedPhone: response.maskedPhone,
        expiresInSeconds: response.expiresInSeconds,
      });
      showToast(t("auth.phoneAuth.smsSent"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(
          error,
          "auth.phoneAuth.requestError",
          t,
        ),
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [onGoToVerify, phoneNumber, showToast, t]);

  const handleGoogleLogin = useCallback(async () => {
    if (googleLoading || loading) return;

    try {
      setGoogleLoading(true);
      const idToken = await requestGoogleIdToken();
      await loginWithGoogleIdToken(idToken);
      showToast(t("auth.login.googleSuccess"), "success");
    } catch (error) {
      showToast(t(getGoogleSignInErrorKey(error)), "error");
    } finally {
      setGoogleLoading(false);
    }
  }, [googleLoading, loading, loginWithGoogleIdToken, showToast, t]);

  const handleAppleLogin = useCallback(async () => {
    if (appleLoading || loading) return;

    setAppleLoading(true);
    try {
      const credential = await requestAppleCredential();
      await loginWithAppleCredential({
        identityToken: credential.identityToken,
      });
      showToast(t("auth.login.success"), "success");
    } catch (error) {
      if (
        error instanceof AppleSignInFlowError &&
        error.reason === "cancelled"
      ) {
        return;
      }
      showToast(
        getLocalizedApiErrorMessage(error, "common.unexpectedError", t),
        "error",
      );
    } finally {
      setAppleLoading(false);
    }
  }, [appleLoading, loading, loginWithAppleCredential, showToast, t]);

  return (
    <ScreenContainer
      padded={false}
      style={styles.screenInner}
      contentContainerStyle={styles.scrollContent}
    >
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior="padding">
        <View style={styles.wrapper}>
          <View style={styles.topBar}>
            <LanguageSelectorButton />
          </View>

          <View style={styles.headerWrap}>
            <View
              style={[styles.logoWrap, { backgroundColor: theme.primaryLight }]}
            >
              <Image
                source={require("../../assets/icon.png")}
                style={styles.logo}
              />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              {t("auth.login.title")}
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}> 
              {t("auth.login.description", { appName: APP_NAME })}
            </Text>
          </View>

          <View style={styles.form}>
            <AppInput
              label={t("auth.phoneAuth.phoneLabel")}
              uncontrolled
              defaultValue={phoneNumber}
              onChangeText={handlePhoneChange}
              onChangeRawText={(raw) => {
                if (raw.length === 9) {
                  setPhoneNumber(formatUzPhoneFromDigits(raw));
                }
              }}
              mask={uzPhoneMask}
              autoCapitalize="none"
              autoCorrect={false}
              iconName="call-outline"
              placeholder={t("auth.phoneAuth.phonePlaceholder")}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleRequestCode();
              }}
            />

            <PrimaryButton
              label={t("auth.phoneAuth.sendCode")}
              onPress={() => {
                void handleRequestCode();
              }}
              loading={loading}
              disabled={!canSubmit}
              style={styles.authAction}
            />
          </View>

          <View style={styles.divider}>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>
              {t("common.or")}
            </Text>
            <View
              style={[styles.dividerLine, { backgroundColor: theme.border }]}
            />
          </View>

          {Platform.OS === "ios" && appleAvailable ? (
            <AppleAuthButton
              variant="signIn"
              loading={appleLoading}
              onPress={() => {
                void handleAppleLogin();
              }}
            />
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.googleBtn,
              {
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
                opacity: googleLoading ? 0.7 : 1,
              },
            ]}
            onPress={() => {
              void handleGoogleLogin();
            }}
            disabled={googleLoading || loading}
            accessibilityState={{
              disabled: googleLoading || loading,
              busy: googleLoading,
            }}
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name="logo-google" size={20} color={theme.text} />
            )}
            <Text style={[styles.providerLabel, { color: theme.text }]}>
              {googleLoading
                ? t("auth.login.googleSigningIn")
                : t("auth.login.googleSignIn")}
            </Text>
          </TouchableOpacity>

          <AdminContactButton style={styles.adminContact} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

export const phoneAuthInputFormatter = (value: string): string =>
  formatUzPhoneFromDigits(value);

const styles = StyleSheet.create({
  screenInner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  keyboardWrap: { flex: 1 },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "flex-end",
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  logo: { width: 62, height: 62, borderRadius: 20 },
  title: { ...typography.displayMedium, textAlign: "center" },
  desc: {
    ...typography.bodyMedium,
    maxWidth: 340,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  form: { width: "100%" },
  authAction: { minHeight: 50, marginTop: spacing.xs },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { ...typography.bodyMedium },
  googleBtn: {
    marginTop: spacing.sm,
    minHeight: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  providerLabel: { ...typography.label, fontWeight: "600" },
  adminContact: { marginTop: spacing.lg },
});
