import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
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
import { spacing, typography } from "../theme";
import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { APP_NAME } from "../constants";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import {
  getGoogleSignInErrorKey,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import {
  AppleSignInFlowError,
  isAppleSignInAvailable,
  requestAppleCredential,
} from "../modules/auth/services/appleSignInService";
import {
  formatLoginIdentifierInput,
  isPhoneLoginIdentifier,
  isValidLoginIdentifier,
  normalizeLoginIdentifier,
} from "../modules/auth/utils/loginIdentifier";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import { AdminContactButton } from "../modules/support/components/AdminContactButton";
import { LanguageSelectorButton } from "../components/LanguageSelectorButton";
import { AppleAuthButton } from "../components/AppleAuthButton";
import { useTranslation } from "../i18n";

interface Props {
  onGoToRegister: () => void;
  onGoToForgotPassword: () => void;
}

export function LoginScreen({ onGoToRegister, onGoToForgotPassword }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { login, loginWithGoogleIdToken, loginWithAppleCredential } = useAuth();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const isPhoneIdentifier = isPhoneLoginIdentifier(userName);

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

  const canSubmit = useMemo(
    () => isValidLoginIdentifier(userName) && password.trim().length >= 4,
    [password, userName],
  );

  const handleIdentifierChange = useCallback((value: string) => {
    setUserName(value);
  }, []);
  const transformIdentifier = useCallback(
    (value: string, currentValue: string) =>
      formatLoginIdentifierInput(value, currentValue),
    [],
  );

  const handleLogin = async () => {
    if (!canSubmit) {
      showToast(t("auth.login.invalidForm"), "error");
      return;
    }

    setLoading(true);
    try {
      await login({
        userName: normalizeLoginIdentifier(userName),
        password,
      });
      showToast(t("auth.login.success"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "auth.login.error", t),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
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
            {/* <Text style={[styles.desc, { color: theme.textSecondary }]}>
              {t("auth.login.description", { appName: APP_NAME })}
            </Text> */}
          </View>

          <View style={styles.form}>
            <AppInput
              label={t("auth.login.identifierLabel")}
              uncontrolled
              defaultValue={userName}
              onChangeText={handleIdentifierChange}
              transformText={transformIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              iconName={isPhoneIdentifier ? "call-outline" : "person-outline"}
              placeholder={t("auth.login.identifierPlaceholder")}
              keyboardType={isPhoneIdentifier ? "phone-pad" : "default"}
              textContentType={
                isPhoneIdentifier ? "telephoneNumber" : "username"
              }
              autoComplete={isPhoneIdentifier ? "tel" : "username"}
              maxLength={isPhoneIdentifier ? 17 : undefined}
              returnKeyType="next"
            />
            <AppInput
              label={t("auth.login.passwordLabel")}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              passwordToggle
              iconName="lock-closed-outline"
              placeholder="******"
            />

            <PrimaryButton
              label={t("auth.login.loginAction")}
              onPress={handleLogin}
              loading={loading}
              disabled={!canSubmit}
              style={styles.authAction}
            />

            <TouchableOpacity
              onPress={onGoToForgotPassword}
              style={styles.forgotBtn}
            >
              <Text style={[styles.link, { color: theme.primary }]}>
                {t("auth.login.forgotPassword")}
              </Text>
            </TouchableOpacity>
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
              <Ionicons name="logo-google" size={20} color={theme.text} />
            )}
            <Text style={[styles.providerLabel, { color: theme.text }]}>
              {googleLoading
                ? t("auth.login.googleSigningIn")
                : t("auth.login.googleSignIn")}
            </Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={[typography.bodySmall, { color: theme.textMuted }]}>
              {t("auth.login.noAccount")}
            </Text>
            <TouchableOpacity onPress={onGoToRegister}>
              <Text style={[styles.link, { color: theme.primary }]}>
                {t("auth.login.registerAction")}
              </Text>
            </TouchableOpacity>
          </View>
          <AdminContactButton style={styles.adminContact} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenInner: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
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
  topBar: {
    position: "absolute",
    top: 0,
    right: 0,
    alignItems: "flex-end",
    marginBottom: spacing.md,
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
  logo: {
    width: 62,
    height: 62,
    borderRadius: 20,
  },
  title: {
    ...typography.displayMedium,
    textAlign: "center",
  },
  desc: {
    ...typography.bodyMedium,
    maxWidth: 340,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  form: {
    width: "100%",
  },
  authAction: {
    minHeight: 50,
    marginTop: spacing.xs,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    paddingVertical: spacing.sm,
  },
  link: {
    ...typography.label,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    ...typography.bodyMedium,
  },
  googleBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  providerLabel: {
    ...typography.bodyLarge,
    fontWeight: "600",
  },
  footerRow: {
    marginTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  adminContact: {
    marginTop: spacing.sm,
  },
});
