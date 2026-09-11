import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "../../../hooks/useTheme";
import { AppTheme, RootStackParamList } from "../../../types";
import { radius, spacing, typography } from "../../../theme";
import { useAppLock } from "../context/AppLockContext";
import { useTranslation } from "../../../i18n";
import { translatePinError } from "../utils/pinErrors";
import { PIN_LENGTH, validatePin } from "../utils/pinValidation";

type Props = NativeStackScreenProps<RootStackParamList, "PinChange">;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export function PinChangeScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { changePin, verifyCurrentPin } = useAppLock();
  const [step, setStep] = useState<"current" | "new" | "confirm">("current");
  const [value, setValue] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [passed, setPassed] = useState(false);
  const shake = React.useRef(new Animated.Value(0)).current;
  const success = React.useRef(new Animated.Value(1)).current;

  const animateError = (text: string) => {
    success.stopAnimation();
    success.setValue(1);
    Animated.sequence([
      Animated.timing(shake, {
        toValue: -9,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 9,
        duration: 45,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -5,
        duration: 40,
        useNativeDriver: true,
      }),
      Animated.spring(shake, {
        toValue: 0,
        friction: 7,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start();
    setPassed(false);
    setMessage(text);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const complete = async (pin: string) => {
    setValue("");
    if (step === "current") {
      setBusy(true);
      try {
        if (!(await verifyCurrentPin(pin))) {
          animateError(t("security.currentPinInvalid"));
          return;
        }
        setCurrentPin(pin);
        setStep("new");
        setPassed(false);
        setMessage("");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === "new") {
      const validation = validatePin(pin);
      if (!validation.valid) {
        animateError(
          validation.code === "length"
            ? t("security.pinLengthError")
            : t("security.pinWeakError"),
        );
        return;
      }
      setNewPin(pin);
      setStep("confirm");
      setPassed(false);
      setMessage("");
      return;
    }
    if (pin !== newPin) {
      setStep("new");
      setNewPin("");
      animateError(t("security.pinMismatch"));
      return;
    }

    setBusy(true);
    try {
      const result = await changePin(currentPin, newPin);
      if (!result.success) {
        setStep("current");
        setCurrentPin("");
        setNewPin("");
        animateError(
          translatePinError(t, result.code, "security.pinSaveError"),
        );
        return;
      }
      Animated.spring(success, {
        toValue: 1.12,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
      setPassed(true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMessage(t("security.pinUpdated"));
      setTimeout(() => navigation.goBack(), 420);
    } catch {
      animateError(t("security.pinSaveError"));
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (busy) return;
    if (digit === "back") {
      setValue((current) => current.slice(0, -1));
      return;
    }
    if (!digit || value.length >= PIN_LENGTH) return;
    const next = value + digit;
    setValue(next);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next.length === PIN_LENGTH) void complete(next);
  };

  const title =
    step === "current"
      ? t("security.currentPin")
      : step === "new"
        ? t("security.newPin")
        : t("security.confirmPin");
  const description =
    step === "current"
      ? t("security.currentPinDescription")
      : step === "new"
        ? t("security.newPinDescription")
        : t("security.confirmPinDescription");

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("security.pinChange")}</Text>
      </View>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.icon,
            { backgroundColor: theme.primaryLight },
            { transform: [{ scale: success }] },
          ]}
        >
          <Ionicons name="key-outline" size={27} color={theme.primary} />
        </Animated.View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.progress}>
          {["current", "new", "confirm"].map((item) => (
            <View
              key={item}
              style={[
                styles.progressBar,
                {
                  backgroundColor:
                    item === step ||
                    ["current", "new", "confirm"].indexOf(item) <
                      ["current", "new", "confirm"].indexOf(step)
                      ? theme.primary
                      : theme.border,
                },
              ]}
            />
          ))}
        </View>
        <Animated.View
          style={[styles.dots, { transform: [{ translateX: shake }] }]}
        >
          {Array.from({ length: PIN_LENGTH }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  borderColor:
                    message && !passed ? theme.dangerColor : theme.primary,
                },
                index < value.length && {
                  backgroundColor:
                    message && !passed ? theme.dangerColor : theme.primary,
                },
              ]}
            />
          ))}
        </Animated.View>
        {message ? (
          <Text
            style={[
              styles.message,
              { color: passed ? theme.successColor : theme.dangerColor },
            ]}
          >
            {message}
          </Text>
        ) : (
          <View style={styles.messageSpacer} />
        )}
        <View style={styles.keypad}>
          {DIGITS.map((digit, index) =>
            digit ? (
              <Pressable
                key={digit}
                accessibilityRole="button"
                accessibilityLabel={digit === "back" ? t("security.deleteDigit") : digit}
                onPress={() => press(digit)}
                style={({ pressed }) => [
                  styles.key,
                  pressed && { backgroundColor: theme.primaryLight },
                ]}
              >
                <Text style={styles.keyText}>
                  {digit === "back" ? "⌫" : digit}
                </Text>
              </Pressable>
            ) : (
              <View key={`empty-${index}`} style={styles.key} />
            ),
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingTop: 8,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.surface,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 17,
      lineHeight: 23,
      fontWeight: "800",
    },
    content: { flex: 1, alignItems: "center", paddingHorizontal: spacing.lg },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xl,
    },
    title: {
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
      marginTop: spacing.md,
    },
    description: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: "center",
      maxWidth: 290,
      marginTop: spacing.xs,
    },
    progress: { flexDirection: "row", gap: 5, marginTop: spacing.lg },
    progressBar: { width: 30, height: 4, borderRadius: 4 },
    dots: {
      flexDirection: "row",
      gap: 16,
      marginTop: spacing.xl,
      minHeight: 20,
    },
    dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.75 },
    message: {
      ...typography.caption,
      textAlign: "center",
      marginTop: spacing.md,
    },
    messageSpacer: { height: 28 },
    keypad: {
      width: 250,
      marginTop: "auto",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      paddingBottom: spacing.md,
    },
    key: {
      width: "33.33%",
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },
    keyText: { color: theme.text, fontSize: 23, fontWeight: "600" },
  });
