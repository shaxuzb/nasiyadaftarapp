import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { OtpInput, OtpInputHandle } from "../components/OtpInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { sendSmsCode, verifySmsCode } from "../services/authApi";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiError";
import { useOtpAutoFill } from "../modules/auth/hooks/useOtpAutoFill";

const OTP_LENGTH = 6;

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
  onGoToLogin: () => void;
}

export function RegisterSmsVerifyScreen({
  registerPayload,
  phoneMasked,
  expiresInSeconds,
  onGoBackToRegister,
  onGoToLogin,
}: Props) {
  const theme = useTheme();
  const { showToast } = useToast();
  const { register } = useAuth();
  const otpInputRef = useRef<OtpInputHandle>(null);
  const verifyingRef = useRef(false);
  const lastSubmittedCodeRef = useRef<string | null>(null);

  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(expiresInSeconds);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const canVerify = useMemo(() => code.trim().length === OTP_LENGTH, [code]);
  const canResend = secondsLeft <= 0;

  const focusOtpInput = useCallback(() => {
    requestAnimationFrame(() => otpInputRef.current?.focus());
  }, []);

  const resetOtpInput = useCallback(() => {
    lastSubmittedCodeRef.current = null;
    setCode("");
    focusOtpInput();
  }, [focusOtpInput]);

  const handleCodeChange = useCallback((value: string) => {
    if (value.length < OTP_LENGTH) {
      lastSubmittedCodeRef.current = null;
    }
    setCode(value);
  }, []);

  const { restartListening } = useOtpAutoFill({
    onCodeReceived: handleCodeChange,
  });

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleVerify = useCallback(
    async (submittedCode?: string) => {
      const normalizedCode = (submittedCode ?? code).trim();

      if (normalizedCode.length !== OTP_LENGTH) {
        showToast("SMS kodni to'g'ri kiriting", "error");
        return;
      }
      if (verifyingRef.current || resending) return;

      verifyingRef.current = true;
      lastSubmittedCodeRef.current = normalizedCode;
      setVerifying(true);
      try {
        const verifyResult = await verifySmsCode({
          phone: registerPayload.phoneNumber,
          code: normalizedCode,
        });

        if (!verifyResult.success) {
          showToast("Kod noto'g'ri yoki muddati o'tgan", "error");
          resetOtpInput();
          return;
        }

        try {
          await register(registerPayload);
        } catch (registrationError) {
          showToast(
            getApiErrorMessage(
              registrationError,
              "Ro'yxatdan o'tishda xatolik",
            ),
            "error",
          );

          if (getApiErrorStatus(registrationError) === 409) {
            onGoToLogin();
          }
          return;
        }

        showToast("Ro'yxatdan o'tish muvaffaqiyatli", "success");
      } catch (error) {
        showToast(
          getApiErrorMessage(error, "Kod noto'g'ri yoki muddati o'tgan"),
          "error",
        );
        resetOtpInput();
      } finally {
        verifyingRef.current = false;
        setVerifying(false);
      }
    },
    [
      code,
      onGoToLogin,
      register,
      registerPayload,
      resending,
      resetOtpInput,
      showToast,
    ],
  );

  useEffect(() => {
    const normalizedCode = code.trim();
    if (
      normalizedCode.length !== OTP_LENGTH ||
      verifying ||
      resending ||
      lastSubmittedCodeRef.current === normalizedCode
    ) {
      return;
    }

    lastSubmittedCodeRef.current = normalizedCode;
    void handleVerify(normalizedCode);
  }, [code, handleVerify, resending, verifying]);

  const handleResend = async () => {
    if (!canResend || verifyingRef.current || resending) return;

    setResending(true);
    try {
      const response = await sendSmsCode({
        phone: registerPayload.phoneNumber,
      });
      lastSubmittedCodeRef.current = null;
      setCode("");
      setSecondsLeft(response.expiresInSeconds ?? 180);
      restartListening();
      focusOtpInput();
      showToast("Kod qayta yuborildi", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Kod yuborishda xatolik"), "error");
    } finally {
      setResending(false);
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
                  name="chatbox-ellipses-outline"
                  size={28}
                  color={theme.primary}
                />
              </View>
              <Text style={[typography.headingLarge, { color: theme.text }]}>
                SMS tasdiqlash
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                Kod {phoneMasked} raqamiga yuborildi
              </Text>
            </View>

            <Text
              style={[
                typography.label,
                { color: theme.textSecondary, marginBottom: spacing.xs },
              ]}
            >
              SMS kod
            </Text>
            <OtpInput
              ref={otpInputRef}
              value={code}
              onChange={handleCodeChange}
              length={OTP_LENGTH}
              autoFocus
            />

            <PrimaryButton
              label="Tasdiqlash"
              onPress={() => {
                void handleVerify();
              }}
              loading={verifying}
              disabled={!canVerify || resending}
              style={{ marginTop: spacing.xs }}
            />

            <TouchableOpacity
              onPress={handleResend}
              disabled={!canResend || resending || verifying}
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

            <TouchableOpacity
              onPress={onGoBackToRegister}
              style={styles.footerBtn}
            >
              <Text style={[typography.label, { color: theme.textMuted }]}>
                Orqaga
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
    paddingTop: spacing.xl,
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
