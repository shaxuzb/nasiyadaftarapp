import React, { useCallback, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
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
import {
  getGoogleSignInErrorKey,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import {
  formatLoginIdentifierInput,
  isPhoneLoginIdentifier,
  isValidLoginIdentifier,
  normalizeLoginIdentifier,
} from "../modules/auth/utils/loginIdentifier";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import { AdminContactButton } from "../modules/support/components/AdminContactButton";
import { LanguageSelectorButton } from "../components/LanguageSelectorButton";
import { useTranslation } from "../i18n";

interface Props {
  onGoToRegister: () => void;
  onGoToForgotPassword: () => void;
}

export function LoginScreen({ onGoToRegister, onGoToForgotPassword }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { login, loginWithGoogleIdToken } = useAuth();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const isPhoneIdentifier = isPhoneLoginIdentifier(userName);

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
      showToast(
        t("auth.login.invalidForm"),
        "error",
      );
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
      showToast(
        t(getGoogleSignInErrorKey(error)),
        "error",
      );
    } finally {
      setGoogleLoading(false);
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
                {t("auth.login.title")}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                {t("auth.login.description", { appName: APP_NAME })}
              </Text>
            </View>

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
              style={{ marginTop: spacing.xs }}
            />

            <TouchableOpacity
              onPress={onGoToForgotPassword}
              style={styles.forgotBtn}
            >
              <Text style={[typography.label, { color: theme.primary }]}>
                {t("auth.login.forgotPassword")}
              </Text>
            </TouchableOpacity>

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
                {t("auth.login.noAccount")}
              </Text>
              <TouchableOpacity onPress={onGoToRegister}>
                <Text style={[typography.label, { color: theme.primary }]}>
                  {t("auth.login.registerAction")}
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
  forgotBtn: {
    marginTop: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xs,
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
