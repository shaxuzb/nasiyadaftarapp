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
import { sendSmsCode } from "../services/authApi";
import { isValidUzPhone, toStoredUzPhone, uzPhoneMask } from "../utils/masks";
import {
  getGoogleSignInErrorMessage,
  requestGoogleIdToken,
} from "../modules/auth/services/googleSignInService";
import { getApiErrorMessage } from "../utils/apiError";

interface Props {
  onGoToLogin: () => void;
  onGoToSmsVerify: (params: {
    registerPayload: {
      userName: string;
      password: string;
      fullName: string;
      phoneNumber: string;
    };
    phoneMasked: string;
    expiresInSeconds: number;
  }) => void;
}

export function RegisterScreen({ onGoToLogin, onGoToSmsVerify }: Props) {
  const theme = useTheme();
  const { showToast } = useToast();
  const { loginWithGoogleIdToken } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+998 ");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      fullName.trim().length > 2 &&
      isValidUzPhone(phoneNumber) &&
      password.trim().length >= 6
    );
  }, [fullName, password, phoneNumber]);

  const handleRegister = async () => {
    if (!canSubmit) {
      showToast("Ma'lumotlarni to'g'ri kiriting", "error");
      return;
    }

    const safePhone = toStoredUzPhone(phoneNumber);
    const userName = safePhone;

    setLoading(true);
    try {
      const registerPayload = {
        userName,
        password,
        fullName: fullName.trim(),
        phoneNumber: safePhone,
      };

      const smsResult = await sendSmsCode({ phone: safePhone });
      showToast("SMS kod yuborildi", "success");

      onGoToSmsVerify({
        registerPayload,
        phoneMasked: smsResult.phoneMasked,
        expiresInSeconds: smsResult.expiresInSeconds,
      });
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "SMS yuborishda xatolik"),
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
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior="padding"
      >
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
                Hisob ochish
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                {APP_NAME} bilan 1 daqiqada ro'yxatdan o'ting va darhol ishni
                boshlang
              </Text>
            </View>

            <AppInput
              label="F.I.SH"
              value={fullName}
              onChangeText={setFullName}
              iconName="person-outline"
              placeholder="Ism Familiya"
            />
            <AppInput
              label="Telefon raqam"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              iconName="call-outline"
              placeholder="+998 XX XXX XX XX"
              mask={uzPhoneMask}
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
              label="Ro'yxatdan o'tish"
              onPress={handleRegister}
              loading={loading}
              disabled={!canSubmit}
              style={{ marginTop: spacing.xs }}
            />

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
      accessibilityState={{ disabled: googleLoading, busy: googleLoading }}
    >
      {googleLoading ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons name="logo-google" size={18} color={theme.text} />
      )}
      <Text style={[typography.label, { color: theme.text }]}>
        {googleLoading ? "Google orqali kirilmoqda..." : "Google bilan kirish"}
      </Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <Text style={[typography.bodySmall, { color: theme.textMuted }]}>
                Akkauntingiz bormi?
              </Text>
              <TouchableOpacity onPress={onGoToLogin}>
                <Text style={[typography.label, { color: theme.primary }]}>
                  Kirish
                </Text>
              </TouchableOpacity>
            </View>
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
  footerRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
});
