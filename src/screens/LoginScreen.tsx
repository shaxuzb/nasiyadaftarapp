import React, { useMemo, useState } from "react";
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
  getGoogleSignInErrorMessage,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import {
  formatLoginIdentifierInput,
  isPhoneLoginIdentifier,
  isValidLoginIdentifier,
  normalizeLoginIdentifier,
} from "../modules/auth/utils/loginIdentifier";
import { getApiErrorMessage } from "../utils/apiError";
import { AdminContactButton } from "../modules/support/components/AdminContactButton";

interface Props {
  onGoToRegister: () => void;
  onGoToForgotPassword: () => void;
}

export function LoginScreen({ onGoToRegister, onGoToForgotPassword }: Props) {
  const theme = useTheme();
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

  const handleIdentifierChange = (value: string) => {
    setUserName((currentValue) =>
      formatLoginIdentifierInput(value, currentValue),
    );
  };

  const handleLogin = async () => {
    if (!canSubmit) {
      showToast(
        "Username yoki telefon raqami va parolni to'g'ri kiriting",
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
      showToast("Muvaffaqiyatli kirildi", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Login yoki parol xato"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const idToken = await requestGoogleIdToken();
      await loginWithGoogleIdToken(idToken);
      showToast("Google orqali tizimga kirildi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, getGoogleSignInErrorMessage(error)),
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
                Xush kelibsiz
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                {APP_NAME} ga kirib, mijozlar va qarzlarni tez boshqaring
              </Text>
            </View>

            <AppInput
              label="Login yoki telefon raqami"
              value={userName}
              onChangeText={handleIdentifierChange}
              autoCapitalize="none"
              autoCorrect={false}
              iconName={isPhoneIdentifier ? "call-outline" : "person-outline"}
              placeholder="Login yoki telefon raqamini kiriting"
              keyboardType={isPhoneIdentifier ? "phone-pad" : "default"}
              textContentType={
                isPhoneIdentifier ? "telephoneNumber" : "username"
              }
              autoComplete={isPhoneIdentifier ? "tel" : "username"}
              maxLength={isPhoneIdentifier ? 17 : undefined}
              returnKeyType="next"
            />
            <AppInput
              label="Parol"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              passwordToggle
              iconName="lock-closed-outline"
              placeholder="******"
            />

            <PrimaryButton
              label="Kirish"
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
                Parolni unutdingizmi?
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
                  ? "Google orqali kirilmoqda..."
                  : "Google bilan kirish"}
              </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={[typography.bodySmall, { color: theme.textMuted }]}>
                Akkauntingiz yo'qmi?
              </Text>
              <TouchableOpacity onPress={onGoToRegister}>
                <Text style={[typography.label, { color: theme.primary }]}>
                  Ro'yxatdan o'tish
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
