import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../../hooks/useTheme";
import { AppTheme } from "../../../types";
import { radius, spacing, typography } from "../../../theme";
import { useAppLock } from "../context/AppLockContext";
import { useConfirmDialog } from "../../../context/ConfirmDialogContext";
import { PIN_LENGTH, validatePin } from "../utils/pinValidation";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
const wait = (duration: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, duration));

export function PinGateScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    setupRequired,
    displayName,
    biometric,
    biometricEnabled,
    submitSetupPin,
    submitUnlockPin,
    unlockWithBiometrics,
    resetPinAndLogout,
  } = useAppLock();
  const { confirm } = useConfirmDialog();
  const [value, setValue] = useState("");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [passed, setPassed] = useState(false);
  const [busy, setBusy] = useState(false);
  const autoPrompted = React.useRef(false);
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

  const submit = async (pin: string) => {
    setValue("");
    setBusy(true);
    try {
      if (setupRequired) {
        if (!firstPin) {
          const result = validatePin(pin);
          if (!result.valid) {
            animateError(result.message);
            return;
          }
          setFirstPin(pin);
          setMessage("");
          return;
        }
        if (pin !== firstPin) {
          setFirstPin(null);
          animateError("PIN-kodlar mos kelmadi. Qayta urinib ko‘ring.");
          return;
        }
        Animated.spring(success, {
          toValue: 1.12,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }).start();
        setPassed(true);
        setMessage("PIN-kod saqlanmoqda…");
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        await wait(220);
        await submitSetupPin(pin);
        return;
      }

      Animated.spring(success, {
        toValue: 1.12,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();
      setPassed(true);
      const result = await submitUnlockPin(pin);
      if (result.status === "invalid")
        animateError(
          `PIN noto‘g‘ri. ${result.attemptsRemaining} urinish qoldi.`,
        );
      else if (result.status === "logged-out")
        animateError("Xavfsizlik uchun hisobdan chiqarildingiz.");
      else
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
    } catch (error) {
      animateError(
        error instanceof Error ? error.message : "PIN-kodni saqlab bo‘lmadi",
      );
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
    setMessage("");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const onBiometric = async () => {
    if (busy || !biometricEnabled) return;
    setBusy(true);
    setPassed(true);
    setMessage("Tasdiqlanmoqda…");
    Animated.spring(success, {
      toValue: 1.12,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
    try {
      const unlocked = await unlockWithBiometrics();
      if (!unlocked)
        animateError(`${biometric?.label ?? "Biometrika"} tasdiqlanmadi`);
    } catch (error) {
      animateError(
        error instanceof Error
          ? error.message
          : `${biometric?.label ?? "Biometrika"} tasdiqlanmadi`,
      );
    } finally {
      setBusy(false);
    }
  };

  const onForgotPin = async () => {
    if (busy) return;
    const accepted = await confirm({
      title: "PIN-kodni unutdingizmi?",
      message:
        "PIN ma’lumotlari o‘chiriladi va xavfsizlik uchun hisobdan chiqasiz. Qayta login qilgach, yangi PIN o‘rnatishingiz mumkin.",
      confirmText: "Chiqish va o‘chirish",
      cancelText: "Bekor qilish",
      variant: "danger",
    });
    if (!accepted) return;
    setBusy(true);
    await resetPinAndLogout();
  };

  React.useEffect(() => {
    if (
      setupRequired ||
      !biometric?.available ||
      !biometricEnabled ||
      autoPrompted.current
    )
      return;
    autoPrompted.current = true;
    let active = true;
    setBusy(true);
    setPassed(true);
    setMessage("Biometrika tekshirilmoqda…");
    Animated.spring(success, {
      toValue: 1.12,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
    void unlockWithBiometrics()
      .then((unlocked) => {
        if (!active) return;
        if (!unlocked) animateError(`${biometric.label} tasdiqlanmadi`);
      })
      .catch((error) => {
        if (!active) return;
        animateError(
          error instanceof Error
            ? error.message
            : `${biometric.label} tasdiqlanmadi`,
        );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      success.stopAnimation();
      shake.stopAnimation();
    };
  }, [biometric, biometricEnabled, setupRequired, unlockWithBiometrics]);

  const confirming = setupRequired && firstPin !== null;
  const title = setupRequired
    ? confirming
      ? "PIN-kodni takrorlang"
      : "PIN-kod yarating"
    : `Xush kelibsiz, ${displayName.split(" ")[0]}`;
  const description = setupRequired
    ? confirming
      ? "Kiritgan PIN-kodingizni yana bir marta yozing."
      : "Hisobingizga tez va xavfsiz kirish uchun 4 xonali PIN tanlang."
    : "Davom etish uchun PIN-kodni kiriting.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.icon,
            { backgroundColor: theme.primaryLight },
            { transform: [{ scale: success }] },
          ]}
        >
          <Ionicons
            name={
              passed
                ? "checkmark"
                : setupRequired
                  ? "key-outline"
                  : "lock-closed-outline"
            }
            size={28}
            color={passed ? theme.successColor : theme.primary}
          />
        </Animated.View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {setupRequired ? (
          <View style={styles.progress}>
            <View
              style={[styles.progressBar, { backgroundColor: theme.primary }]}
            />
            <View
              style={[
                styles.progressBar,
                { backgroundColor: confirming ? theme.primary : theme.border },
              ]}
            />
          </View>
        ) : null}
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
        {busy ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.loadingText}>
              {passed ? "Tasdiqlanmoqda…" : "Tekshirilmoqda…"}
            </Text>
          </View>
        ) : (
          <View style={styles.keypad}>
            {DIGITS.map((digit, index) => {
              if (index === 9 && !setupRequired && biometricEnabled) {
                return (
                  <Pressable
                    key="biometric"
                    accessibilityRole="button"
                    accessibilityLabel={`${biometric?.label ?? "Biometrika"} bilan kirish`}
                    onPress={() => void onBiometric()}
                    style={({ pressed }) => [
                      styles.key,
                      styles.biometricKey,
                      pressed && { backgroundColor: theme.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name={biometric?.icon ?? "finger-print-outline"}
                      size={26}
                      color={theme.primary}
                    />
                  </Pressable>
                );
              }
              return digit ? (
                <Pressable
                  key={digit}
                  accessibilityRole="button"
                  accessibilityLabel={digit === "back" ? "O‘chirish" : digit}
                  onPress={() => press(digit)}
                  style={({ pressed }) => [
                    styles.key,
                    pressed && { backgroundColor: theme.primaryLight },
                  ]}
                >
                  <Text style={styles.keyText}>
                    {digit === "back" ? (
                      <Ionicons name="backspace-outline" size={28} />
                    ) : (
                      digit
                    )}
                  </Text>
                </Pressable>
              ) : (
                <View key={`empty-${index}`} style={styles.key} />
              );
            })}
          </View>
        )}
        {!setupRequired && !busy ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="PIN-kodni unutdim"
            onPress={() => void onForgotPin()}
            style={({ pressed }) => [
              styles.forgotButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={16}
              color={theme.textSecondary}
            />
            <Text style={styles.forgotText}>PIN-kodni unutdingizmi?</Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1, alignItems: "center", padding: spacing.lg },
    icon: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.xxl,
    },
    title: {
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
      marginTop: spacing.md,
      fontSize: 25,
      lineHeight: 32,
    },
    description: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: "center",
      maxWidth: 320,
      marginTop: spacing.xs,
      fontSize: 16,
      lineHeight: 22,
    },
    progress: { flexDirection: "row", gap: 6, marginTop: spacing.lg },
    progressBar: { width: 32, height: 4, borderRadius: 4 },
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
      fontSize: 15,
      lineHeight: 20,
    },
    messageSpacer: { height: 28 },
    keypad: {
      width: 300,
      marginTop: "auto",
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      paddingBottom: spacing.md,
    },
    loadingPanel: {
      height: 262,
      width: 300,
      marginTop: "auto",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    loadingText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 20,
    },
    key: {
      width: "33.33%",
      height: 74,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
    },
    biometricKey: { backgroundColor: theme.primaryLight },
    keyText: { color: theme.text, fontSize: 30, fontWeight: "700" },
    pressed: { opacity: 0.72 },
    forgotButton: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
    },
    forgotText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  });
