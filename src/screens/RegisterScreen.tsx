import React, { useEffect, useMemo, useState } from "react";
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
import { AppleAuthButton } from "../components/AppleAuthButton";
import { useTranslation } from "../i18n";
import type { AppleLoginRequest } from "../modules/auth/types";

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
  const [pendingAppleCredential, setPendingAppleCredential] =
    useState<AppleLoginRequest | null>(null);
  const [appleNameError, setAppleNameError] = useState<string | undefined>();

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
      const credential =
        pendingAppleCredential ?? (await requestAppleCredential());
      const resolvedFullName = credential.fullName ?? fullName.trim();
      if (resolvedFullName.length < 3) {
        setPendingAppleCredential(credential);
        setAppleNameError(t("auth.register.appleNameRequired"));
        showToast(t("auth.register.appleNameRequired"), "error");
        return;
      }

      setPendingAppleCredential(null);
      setAppleNameError(undefined);
      await loginWithAppleCredential({
        ...credential,
        fullName: resolvedFullName,
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
              {t("auth.register.title")}
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              {t("auth.register.description", { appName: APP_NAME })}
            </Text>
          </View>

          <View style={styles.form}>
            <AppInput
              label={t("auth.register.fullNameLabel")}
              value={fullName}
              onChangeText={(value) => {
                setFullName(value);
                if (appleNameError) setAppleNameError(undefined);
              }}
              iconName="person-outline"
              placeholder={t("auth.register.fullNamePlaceholder")}
              error={appleNameError}
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
              label={`${t("auth.register.action")}`}
              onPress={handleRegister}
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
              variant="signUp"
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
              {t("auth.register.hasAccount")}
            </Text>
            <TouchableOpacity onPress={onGoToLogin}>
              <Text style={[styles.link, { color: theme.primary }]}>
                {t("auth.register.loginAction")}
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
    top: spacing.sm,
    right: spacing.md,
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
    borderRadius: 18,
    marginTop: spacing.xs,
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
    borderRadius: 18,
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
