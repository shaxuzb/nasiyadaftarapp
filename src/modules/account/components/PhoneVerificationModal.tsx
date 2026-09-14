import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { AppInput } from "../../../components/AppInput";
import { OtpInput, OtpInputHandle } from "../../../components/OtpInput";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useTheme } from "../../../hooks/useTheme";
import { AppTheme } from "../../../types";
import {
  isValidUzPhone,
  toStoredUzPhone,
  uzPhoneMask,
} from "../../../utils/masks";
import {
  confirmPhoneChange,
  requestPhoneChange,
} from "../services/accountService";
import { useOtpAutoFill } from "../../auth/hooks/useOtpAutoFill";
import { useTranslation } from "../../../i18n";
import { getLocalizedApiErrorMessage } from "../../../i18n/apiErrors";

interface Props {
  visible: boolean;
  currentPhone?: string | null;
  onDismiss: () => void;
  onVerified: (phoneNumber: string) => Promise<void> | void;
}

const OTP_LENGTH = 6;

function PhoneOtpAutoFill({
  onCodeReceived,
}: {
  onCodeReceived: (code: string) => void;
}) {
  useOtpAutoFill({ onCodeReceived });
  return null;
}

export function PhoneVerificationModal({
  visible,
  currentPhone,
  onDismiss,
  onVerified,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const otpRef = useRef<OtpInputHandle>(null);
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || "+998 ");
  const [requestedPhone, setRequestedPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const isChange = Boolean(currentPhone?.trim());

  const handlePhoneChange = useCallback((value: string) => {
    setPhoneNumber(value);
    setError((current) => (current ? undefined : current));
  }, []);

  const handleAutoFilledCode = useCallback((value: string) => {
    setCode(value);
    setError(undefined);
  }, []);

  useEffect(() => {
    if (!visible) return;
    setPhoneNumber(currentPhone || "+998 ");
    setRequestedPhone("");
    setCode("");
    setStage("phone");
    setError(undefined);
  }, [currentPhone, visible]);

  async function handleRequest() {
    if (!isValidUzPhone(phoneNumber)) {
      setError(t("errors.validation"));
      return;
    }

    const normalizedPhone = toStoredUzPhone(phoneNumber);
    setLoading(true);
    setError(undefined);
    try {
      await requestPhoneChange({ phoneNumber: normalizedPhone });
      setRequestedPhone(normalizedPhone);
      setStage("code");
      requestAnimationFrame(() => otpRef.current?.focus());
    } catch (requestError) {
      setError(getLocalizedApiErrorMessage(requestError, "errors.generic", t));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (code.trim().length !== OTP_LENGTH) {
      setError(t("security.otpRequired"));
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      await confirmPhoneChange({
        phoneNumber: requestedPhone,
        code: code.trim(),
      });
      await onVerified(requestedPhone);
      onDismiss();
    } catch (confirmError) {
      setError(
        getLocalizedApiErrorMessage(confirmError, "security.otpExpired", t),
      );
      setCode("");
      requestAnimationFrame(() => otpRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <KeyboardAwareScrollView
        contentContainerStyle={styles.overlay}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        bottomOffset={20}
      >
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons
              name="phone-portrait-outline"
              size={27}
              color={theme.primary}
            />
          </View>
          <Text style={styles.title}>
            {isChange ? t("security.updatePhone") : t("security.linkPhone")}
          </Text>
          <Text style={styles.description}>
            {stage === "phone"
              ? t("security.phoneVerificationDescription")
              : t("security.enterCodeForPhone", { phone: requestedPhone })}
          </Text>

          {visible ? (
            <PhoneOtpAutoFill onCodeReceived={handleAutoFilledCode} />
          ) : null}

          {stage === "phone" ? (
            <AppInput
              label={t("security.phoneNumber")}
              uncontrolled
              defaultValue={phoneNumber}
              onChangeText={handlePhoneChange}
              placeholder="+998 XX XXX XX XX"
              iconName="call-outline"
              keyboardType="phone-pad"
              mask={uzPhoneMask}
              error={error}
              autoFocus
            />
          ) : (
            <View style={styles.codeSection}>
              <Text style={styles.codeLabel}>
                {t("security.verificationCode")}
              </Text>
              <OtpInput
                ref={otpRef}
                value={code}
                onChange={(value) => {
                  setCode(value);
                  if (error) setError(undefined);
                }}
                length={OTP_LENGTH}
                autoFocus
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setStage("phone");
                  setCode("");
                  setError(undefined);
                }}
                style={styles.changePhoneButton}
              >
                <Text style={styles.changePhoneText}>
                  {t("security.changePhone")}
                </Text>
              </Pressable>
            </View>
          )}

          <PrimaryButton
            label={
              stage === "phone" ? t("security.sendCode") : t("common.confirm")
            }
            onPress={() => {
              void (stage === "phone" ? handleRequest() : handleConfirm());
            }}
            loading={loading}
            disabled={loading}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.later")}
            disabled={loading}
            onPress={onDismiss}
            style={styles.laterButton}
          >
            <Text style={styles.laterText}>{t("common.later")}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flexGrow: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      backgroundColor: "rgba(7, 20, 38, 0.56)",
    },
    card: {
      width: "100%",
      maxWidth: 440,
      gap: 12,
      padding: 20,
      backgroundColor: theme.surface,
      borderRadius: 22,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    iconWrap: {
      width: 56,
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      borderRadius: 28,
      backgroundColor: theme.primaryLight,
    },
    title: {
      color: theme.text,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      textAlign: "center",
    },
    description: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      textAlign: "center",
    },
    codeSection: { gap: 8 },
    codeLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    errorText: { color: theme.dangerColor, fontSize: 12, lineHeight: 17 },
    changePhoneButton: {
      minHeight: 36,
      justifyContent: "center",
      alignItems: "center",
    },
    changePhoneText: {
      color: theme.primary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    laterButton: {
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    laterText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
  });
