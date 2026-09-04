import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../components/AppInput";
import { OtpInput } from "../components/OtpInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { confirmPasswordReset } from "../services/authApi";
import { useToast } from "../context/ToastContext";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { getApiErrorMessage } from "../utils/apiError";
import { useOtpAutoFill } from "../modules/auth/hooks/useOtpAutoFill";

interface Props {
  phone: string;
  onGoBackToLogin: () => void;
}

export function PasswordResetConfirmScreen({ phone, onGoBackToLogin }: Props) {
  const theme = useTheme();
  const { showToast } = useToast();

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useOtpAutoFill({ onCodeReceived: setCode });

  const canSubmit = useMemo(
    () => code.trim().length === 6 && newPassword.trim().length >= 6,
    [code, newPassword],
  );

  const handleConfirm = async () => {
    if (!canSubmit) {
      showToast("Kod va yangi parolni to'g'ri kiriting", "error");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset({
        phone,
        code: code.trim(),
        newPassword,
      });
      showToast("Parol muvaffaqiyatli yangilandi", "success");
      onGoBackToLogin();
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Kod yoki parol noto'g'ri"),
        "error",
      );
    } finally {
      setLoading(false);
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
                <Ionicons name="key-outline" size={28} color={theme.primary} />
              </View>
              <Text style={[typography.headingLarge, { color: theme.text }]}>Yangi parol</Text>
              <Text style={[typography.bodySmall, styles.desc, { color: theme.textSecondary }]}>
                SMS orqali kelgan kodni kiriting va yangi parol o'rnating
              </Text>
            </View>

            <Text style={[typography.label, { color: theme.textSecondary, marginBottom: spacing.xs }]}>
              SMS kod
            </Text>
            <OtpInput value={code} onChange={setCode} />

            <AppInput
              label="Yangi parol"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              iconName="lock-closed-outline"
              placeholder="******"
            />

            <PrimaryButton
              label="Saqlash"
              onPress={handleConfirm}
              loading={loading}
              disabled={!canSubmit}
              style={{ marginTop: spacing.xs }}
            />

            <TouchableOpacity onPress={onGoBackToLogin} style={styles.footerBtn}>
              <Text style={[typography.label, { color: theme.primary }]}>Loginga qaytish</Text>
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
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
});
