import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

import { LanguageSelectorButton } from "../components/LanguageSelectorButton";
import { OtpInput, OtpInputHandle } from "../components/OtpInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTranslation } from "../i18n";
import { getLocalizedApiErrorMessage } from "../i18n/apiErrors";
import { useOtpAutoFill } from "../modules/auth/hooks/useOtpAutoFill";
import { requestPhoneAuthCode } from "../services/authApi";
import { useTheme } from "../hooks/useTheme";
import { maskUzPhoneForDisplay } from "../utils/masks";
import { spacing, typography } from "../theme";

const OTP_LENGTH = 6;
const DEFAULT_CODE_EXPIRY_SECONDS = 300;

interface Props {
  phoneNumber: string;
  maskedPhone: string;
  expiresInSeconds: number;
  onGoBack: () => void;
}

export function PhoneAuthVerifyScreen({
  phoneNumber,
  maskedPhone,
  expiresInSeconds,
  onGoBack,
}: Props) {
  const theme = useTheme();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { loginWithPhoneCode } = useAuth();
  const otpInputRef = useRef<OtpInputHandle>(null);
  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);
  const lastSubmittedCodeRef = useRef<string | null>(null);

  const [code, setCode] = useState("");
  const [phoneMaskedValue, setPhoneMaskedValue] = useState(
    maskedPhone || maskUzPhoneForDisplay(phoneNumber),
  );
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(
      0,
      Math.floor(expiresInSeconds || DEFAULT_CODE_EXPIRY_SECONDS),
    ),
  );
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
    autoStart: true,
  });

  useEffect(() => {
    if (!isFocused) return;

    focusOtpInput();
    const keyboardSubscription = Keyboard.addListener("keyboardDidHide", () => {
      if (!verifyingRef.current && !resendingRef.current) {
        focusOtpInput();
      }
    });

    return () => keyboardSubscription.remove();
  }, [focusOtpInput, isFocused]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((previous) => (previous <= 1 ? 0 : previous - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const requestCode = useCallback(async () => {
    if (resendingRef.current || !canResend) return;

    resendingRef.current = true;
    setResending(true);
    lastSubmittedCodeRef.current = null;
    setCode("");

    try {
      await restartListening();
      const response = await requestPhoneAuthCode({ phoneNumber });
      setPhoneMaskedValue(response.maskedPhone);
      setSecondsLeft(
        Math.max(
          0,
          Math.floor(response.expiresInSeconds || DEFAULT_CODE_EXPIRY_SECONDS),
        ),
      );
      focusOtpInput();
      showToast(t("auth.smsVerify.resendSuccess"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "auth.phoneAuth.requestError", t),
        "error",
      );
    } finally {
      resendingRef.current = false;
      setResending(false);
    }
  }, [canResend, focusOtpInput, phoneNumber, restartListening, showToast, t]);

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
        await loginWithPhoneCode(phoneNumber, normalizedCode);
        showToast(t("auth.phoneAuth.success"), "success");
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
    [code, loginWithPhoneCode, phoneNumber, resetOtpInput, resending, showToast, t],
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

  return (
    <ScreenContainer
      padded={false}
      style={styles.screenInner}
      contentContainerStyle={styles.scrollContent}
    >
      <KeyboardAvoidingView style={styles.keyboardWrap} behavior="padding">
        <View style={styles.wrapper}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={onGoBack}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
            >
              <Ionicons name="arrow-back" size={23} color={theme.text} />
            </TouchableOpacity>
            <LanguageSelectorButton />
          </View>

          <View style={styles.headerWrap}>
            <View
              style={[styles.logoWrap, { backgroundColor: theme.primaryLight }]}
            >
              <Ionicons
                name="chatbox-ellipses-outline"
                size={28}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              {t("auth.smsVerify.title")}
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary }]}>
              {t("auth.smsVerify.sentTo", { phone: phoneMaskedValue })}
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
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
              style={styles.verifyButton}
            />

            <TouchableOpacity
              onPress={() => void requestCode()}
              disabled={!canResend || verifying || resending}
              style={styles.resendButton}
            >
              {resending ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text
                  style={[
                    typography.label,
                    {
                      color: canResend ? theme.primary : theme.textMuted,
                    },
                  ]}
                >
                  {canResend
                    ? t("auth.smsVerify.resend")
                    : t("auth.smsVerify.resendCountdown", {
                        seconds: secondsLeft,
                      })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screenInner: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    justifyContent: "center",
  },
  keyboardWrap: { flex: 1, justifyContent: "center" },
  wrapper: { width: "100%", maxWidth: 520, alignSelf: "center" },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerWrap: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logoWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { ...typography.displayMedium, textAlign: "center" },
  desc: {
    ...typography.bodyMedium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  form: { width: "100%" },
  codeLabel: { ...typography.label, marginBottom: spacing.xs },
  verifyButton: { marginTop: spacing.sm },
  resendButton: {
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
});
