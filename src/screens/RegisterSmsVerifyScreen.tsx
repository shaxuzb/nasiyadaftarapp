import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AxiosError } from "axios";
import { OtpInput } from "../components/OtpInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { sendSmsCode, verifySmsCode } from "../services/authApi";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

interface RegisterPayload {
  userName: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

interface Props {
  registerPayload: RegisterPayload;
  phoneMasked: string;
  expiresInSeconds: number;
  onGoBackToRegister: () => void;
}

function extractApiDetail(error: unknown): string | undefined {
  const err = error as AxiosError<{ detail?: string; message?: string }>;
  return err?.response?.data?.detail ?? err?.response?.data?.message;
}

export function RegisterSmsVerifyScreen({
  registerPayload,
  phoneMasked,
  expiresInSeconds,
  onGoBackToRegister,
}: Props) {
  const theme = useTheme();
  const { showToast } = useToast();
  const { register } = useAuth();

  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const canVerify = useMemo(() => code.trim().length >= 4, [code]);
  const canResend = secondsLeft <= 0;

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleVerify = async () => {
    if (!canVerify) {
      showToast("SMS kodni to'g'ri kiriting", "error");
      return;
    }

    setVerifying(true);
    try {
      const verifyResult = await verifySmsCode({
        phone: registerPayload.phoneNumber,
        code: code.trim(),
      });

      if (!verifyResult.success) {
        showToast("Kod noto'g'ri yoki muddati o'tgan", "error");
        return;
      }

      await register(registerPayload);
      showToast("Ro'yxatdan o'tish muvaffaqiyatli", "success");
    } catch (error) {
      showToast(extractApiDetail(error) ?? "Kod noto'g'ri yoki muddati o'tgan", "error");
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    try {
      const response = await sendSmsCode({ phone: registerPayload.phoneNumber });
      setSecondsLeft(response.expiresInSeconds ?? 180);
      showToast("Kod qayta yuborildi", "success");
    } catch (error) {
      showToast(extractApiDetail(error) ?? "Kod yuborishda xatolik", "error");
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.scrollContent}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior="padding"
      >
        <View style={styles.wrapper}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.headerWrap}>
              <View style={[styles.logoWrap, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="chatbox-ellipses-outline" size={28} color={theme.primary} />
              </View>
              <Text style={[typography.headingLarge, { color: theme.text }]}>SMS tasdiqlash</Text>
              <Text style={[typography.bodySmall, styles.desc, { color: theme.textSecondary }]}>
                Kod {phoneMasked} raqamiga yuborildi
              </Text>
            </View>

            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>
              SMS kod
            </Text>
            <OtpInput value={code} onChange={setCode} autoFocus />

            <PrimaryButton
              label="Tasdiqlash"
              onPress={handleVerify}
              loading={verifying}
              disabled={!canVerify}
              style={{ marginTop: spacing.xs }}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || resending}
              style={styles.footerBtn}
            >
              <Text
                style={[
                  typography.label,
                  { color: canResend ? theme.primary : theme.textMuted },
                ]}
              >
                {canResend
                  ? resending
                    ? "Yuborilmoqda..."
                    : "Kod qayta yuborish"
                  : `Qayta yuborish ${secondsLeft}s`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onGoBackToRegister} style={styles.footerBtn}>
              <Text style={[typography.label, { color: theme.textMuted }]}>Orqaga</Text>
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
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
