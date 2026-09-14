import React, { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { APP_NAME } from "../constants";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { isValidUzPhone, toStoredUzPhone, uzPhoneMask } from "../utils/masks";
import {
  getGoogleSignInErrorKey,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import {
  AppleSignInFlowError,
  isAppleSignInAvailable,
  requestAppleCredential,
} from "../modules/auth/services/appleSignInService";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import { AdminContactButton } from "../modules/support/components/AdminContactButton";
import { LanguageSelectorButton } from "../components/LanguageSelectorButton";
import { useTranslation } from "../i18n";

interface Props {
  onGoToLogin: () => void;
  onGoToSmsVerify: (params: {
    registerPayload: {
      userName: string;
      password: string;
      fullName: string;
      phoneNumber: string;
    };
  }) => void;
}

export function RegisterScreen({ onGoToLogin, onGoToSmsVerify }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { loginWithGoogleIdToken, loginWithAppleCredential } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

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

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 2 &&
      isValidUzPhone(phoneNumber) &&
      password.trim().length >= 6
    );
  }, [fullName, password, phoneNumber]);

  const handleRegister = () => {
    if (!canSubmit) {
      showToast(t("auth.register.invalidForm"), "error");
      return;
    }

    const safePhone = toStoredUzPhone(phoneNumber);
    const userName = safePhone;

    onGoToSmsVerify({
      registerPayload: {
        userName,
        password,
        fullName: fullName.trim(),
        phoneNumber: safePhone,
      },
    });
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const idToken = await requestGoogleIdToken();
      await loginWithGoogleIdToken(idToken);
      showToast(t("auth.register.googleSuccess"), "success");
    } catch (error) {
      showToast(t(getGoogleSignInErrorKey(error)), "error");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    if (appleLoading) return;

    setAppleLoading(true);
    try {
      const credential = await requestAppleCredential();
      await loginWithAppleCredential(credential);
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
            <View style={styles.topBar}>
              <LanguageSelectorButton />
            </View>
            <View style={styles.headerWrap}>
              <View
                style={[
                  styles.logoWrap,
                  { backgroundColor: theme.primaryLight },
                ]}
              >
                <Image
                  source={require("../../assets/icon.png")}
                  style={styles.logo}
                />
              </View>
              <Text style={[typography.headingLarge, { color: theme.text }]}>
                {t("auth.register.title")}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                {t("auth.register.description", { appName: APP_NAME })}
              </Text>
            </View>

            <AppInput
              label={t("auth.register.fullNameLabel")}
              value={fullName}
              onChangeText={setFullName}
              iconName="person-outline"
              placeholder={t("auth.register.fullNamePlaceholder")}
            />
            <AppInput
              label={t("auth.register.phoneLabel")}
              uncontrolled
              defaultValue={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              iconName="call-outline"
              placeholder={t("auth.register.phonePlaceholder")}
              mask={uzPhoneMask}
            />
            <AppInput
              label={t("auth.register.passwordLabel")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              passwordToggle
              iconName="lock-closed-outline"
              placeholder="******"
            />

            <PrimaryButton
              label={t("auth.register.action")}
              onPress={handleRegister}
              disabled={!canSubmit}
              style={{ marginTop: spacing.xs }}
            />

            {Platform.OS === "ios" && appleAvailable ? (
              <View style={styles.appleWrap}>
                {appleLoading ? (
                  <View
                    style={[
                      styles.appleLoading,
                      { borderColor: theme.border },
                    ]}
                  >
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
                    }
                    buttonStyle={
                      AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={radius.md}
                    style={styles.appleButton}
                    onPress={() => {
                      void handleAppleLogin();
                    }}
                  />
                )}
              </View>
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
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              accessibilityState={{
                disabled: googleLoading,
                busy: googleLoading,
              }}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="logo-google" size={18} color={theme.text} />
              )}
              <Text style={[typography.label, { color: theme.text }]}>
                {googleLoading
                  ? t("auth.login.googleSigningIn")
                  : t("auth.login.googleSignIn")}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={[typography.bodySmall, { color: theme.textMuted }]}>
                {t("auth.register.hasAccount")}
              </Text>
              <TouchableOpacity onPress={onGoToLogin}>
                <Text style={[typography.label, { color: theme.primary }]}>
                  {t("auth.register.loginAction")}
                </Text>
              </TouchableOpacity>
            </View>
            <AdminContactButton style={styles.adminContact} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
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
  topBar: {
    alignItems: "flex-end",
    marginBottom: spacing.xs,
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
  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
  },
  desc: {
    textAlign: "center",
    marginTop: spacing.xs,
  },
  appleWrap: {
    marginTop: spacing.sm,
  },
  appleButton: {
    width: "100%",
    height: 48,
  },
  appleLoading: {
    height: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  googleBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    minHeight: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  adminContact: {
    marginTop: spacing.sm,
  },
});
