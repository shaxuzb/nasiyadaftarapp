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
import { getApiErrorStatus } from "../utils/apiError";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import { useTranslation } from "../i18n";
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
  const { t } = useTranslation();
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
        showToast(t("auth.smsVerify.invalidCode"), "error");
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
          showToast(t("auth.smsVerify.expiredCode"), "error");
          resetOtpInput();
          return;
        }

        try {
          await register(registerPayload);
        } catch (registrationError) {
          showToast(
            getLocalizedApiErrorMessage(
              registrationError,
              "auth.smsVerify.registrationError",
              t,
            ),
            "error",
          );

          if (getApiErrorStatus(registrationError) === 409) {
            onGoToLogin();
          }
          return;
        }

        showToast(t("auth.smsVerify.success"), "success");
      } catch (error) {
        showToast(
          getLocalizedApiErrorMessage(error, "auth.smsVerify.expiredCode", t),
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
      t,
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
      showToast(t("auth.smsVerify.resendSuccess"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "auth.smsVerify.resendError", t),
        "error",
      );
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
                {t("auth.smsVerify.title")}
              </Text>
              <Text
                style={[
                  typography.bodySmall,
                  styles.desc,
                  { color: theme.textSecondary },
                ]}
              >
                {t("auth.smsVerify.sentTo", { phone: phoneMasked })}
              </Text>
            </View>

            <Text
              style={[
                typography.label,
                { color: theme.textSecondary, marginBottom: spacing.xs },
              ]}
            >
              {t("auth.smsVerify.codeLabel")}
            </Text>
            <OtpInput
              ref={otpInputRef}
              value={code}
              onChange={handleCodeChange}
              length={OTP_LENGTH}
              autoFocus
            />

            <PrimaryButton
              label={t("auth.smsVerify.verifyAction")}
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
                    ? t("auth.smsVerify.resending")
                    : t("auth.smsVerify.resend")
                  : t("auth.smsVerify.resendCountdown", {
                      seconds: secondsLeft,
                    })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onGoBackToRegister}
              style={styles.footerBtn}
            >
              <Text style={[typography.label, { color: theme.textMuted }]}>
                {t("auth.smsVerify.back")}
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
