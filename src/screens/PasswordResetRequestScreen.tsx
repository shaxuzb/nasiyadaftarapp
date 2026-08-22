import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { requestPasswordReset } from "../services/authApi";
import { useToast } from "../context/ToastContext";
import { APP_NAME } from "../constants";
import { toStoredUzPhone, uzPhoneMask, isValidUzPhone } from "../utils/masks";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { getApiErrorMessage } from "../utils/apiError";

interface Props {
  onGoBackToLogin: () => void;
  onGoToConfirm: (phone: string) => void;
}

export function PasswordResetRequestScreen({ onGoBackToLogin, onGoToConfirm }: Props) {
  const theme = useTheme();
  const { showToast } = useToast();

  const [phone, setPhone] = useState("+998 ");
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => isValidUzPhone(phone), [phone]);

  const handleRequest = async () => {
    if (!canSubmit) {
      showToast("Telefon raqamni to'g'ri kiriting", "error");
      return;
    }

    const normalizedPhone = toStoredUzPhone(phone);
    setLoading(true);
    try {
      await requestPasswordReset({ phone: normalizedPhone });
      showToast("SMS kod yuborildi", "success");
      onGoToConfirm(normalizedPhone);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Foydalanuvchi topilmadi"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer contentContainerStyle={styles.scrollContent} >
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior="padding"
      >
        <View style={styles.wrapper}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.headerWrap}>
              <View style={[styles.logoWrap, { backgroundColor: theme.primaryLight }]}>
                <Ionicons name="lock-open-outline" size={28} color={theme.primary} />
              </View>
              <Text style={[typography.headingLarge, { color: theme.text }]}>Parolni tiklash</Text>
              <Text style={[typography.bodySmall, styles.desc, { color: theme.textSecondary }]}>
                {APP_NAME} uchun telefon raqamingizni kiriting, SMS kod yuboramiz
              </Text>
            </View>

            <AppInput
              label="Telefon raqam"
              value={phone}
              onChangeText={setPhone}
              placeholder="+998 XX XXX XX XX"
              iconName="call-outline"
              keyboardType="phone-pad"
              mask={uzPhoneMask}
            />

            <PrimaryButton
              label="Kod yuborish"
              onPress={handleRequest}
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
