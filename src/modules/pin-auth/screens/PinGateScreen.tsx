import React, { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../../../hooks/useTheme";
import { AppTheme } from "../../../types";
import { radius, spacing, typography } from "../../../theme";
import { useAppLock } from "../context/AppLockContext";
import { PIN_LENGTH, validatePin } from "../utils/pinValidation";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];
const wait = (duration: number) => new Promise<void>((resolve) => setTimeout(resolve, duration));

export function PinGateScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { setupRequired, displayName, biometric, biometricEnabled, submitSetupPin, submitUnlockPin, unlockWithBiometrics } = useAppLock();
  const [value, setValue] = useState("");
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [passed, setPassed] = useState(false);
  const [busy, setBusy] = useState(false);
  const shake = React.useRef(new Animated.Value(0)).current;
  const success = React.useRef(new Animated.Value(1)).current;

  const animateError = (text: string) => {
    success.stopAnimation();
    success.setValue(1);
    Animated.sequence([
      Animated.timing(shake, { toValue: -9, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 9, duration: 45, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.spring(shake, { toValue: 0, friction: 7, tension: 120, useNativeDriver: true }),
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
          if (!result.valid) { animateError(result.message); return; }
          setFirstPin(pin);
          setMessage("");
          return;
        }
        if (pin !== firstPin) {
          setFirstPin(null);
          animateError("PIN-kodlar mos kelmadi. Qayta urinib ko‘ring.");
          return;
        }
        Animated.spring(success, { toValue: 1.12, friction: 5, tension: 100, useNativeDriver: true }).start();
        setPassed(true);
        setMessage("PIN-kod saqlanmoqda…");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await wait(220);
        await submitSetupPin(pin);
        return;
      }

      Animated.spring(success, { toValue: 1.12, friction: 5, tension: 100, useNativeDriver: true }).start();
      setPassed(true);
      const result = await submitUnlockPin(pin);
      if (result.status === "invalid") animateError(`PIN noto‘g‘ri. ${result.attemptsRemaining} urinish qoldi.`);
      else if (result.status === "logged-out") animateError("Xavfsizlik uchun hisobdan chiqarildingiz.");
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      animateError(error instanceof Error ? error.message : "PIN-kodni saqlab bo‘lmadi");
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (busy) return;
    if (digit === "back") { setValue((current) => current.slice(0, -1)); return; }
    if (!digit || value.length >= PIN_LENGTH) return;
    const next = value + digit;
    setValue(next);
    setMessage("");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const onBiometric = async () => {
    if (busy) return;
    setBusy(true);
    setPassed(true);
    setMessage("Tasdiqlanmoqda…");
    Animated.spring(success, { toValue: 1.12, friction: 5, tension: 100, useNativeDriver: true }).start();
    const unlocked = await unlockWithBiometrics();
    setBusy(false);
    if (!unlocked) animateError(`${biometric?.label ?? "Biometrik kirish"} tasdiqlanmadi`);
  };

  const confirming = setupRequired && firstPin !== null;
  const title = setupRequired ? (confirming ? "PIN-kodni takrorlang" : "PIN-kod yarating") : `Xush kelibsiz, ${displayName.split(" ")[0]}`;
  const description = setupRequired ? (confirming ? "Kiritgan PIN-kodingizni yana bir marta yozing." : "Hisobingizga tez va xavfsiz kirish uchun 4 xonali PIN tanlang.") : "Davom etish uchun PIN-kodni kiriting.";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Animated.View style={[styles.icon, { backgroundColor: theme.primaryLight }, { transform: [{ scale: success }] }]}>
          <Ionicons name={passed ? "checkmark" : setupRequired ? "key-outline" : "lock-closed-outline"} size={28} color={passed ? theme.successColor : theme.primary} />
        </Animated.View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        {setupRequired ? <View style={styles.progress}><View style={[styles.progressBar, { backgroundColor: theme.primary }]} /><View style={[styles.progressBar, { backgroundColor: confirming ? theme.primary : theme.border }]} /></View> : null}
        <Animated.View style={[styles.dots, { transform: [{ translateX: shake }] }]}>
          {Array.from({ length: PIN_LENGTH }, (_, index) => <View key={index} style={[styles.dot, { borderColor: message && !passed ? theme.dangerColor : theme.primary }, index < value.length && { backgroundColor: message && !passed ? theme.dangerColor : theme.primary }]} />)}
        </Animated.View>
        {message ? <Text style={[styles.message, { color: passed ? theme.successColor : theme.dangerColor }]}>{message}</Text> : <View style={styles.messageSpacer} />}
        {!setupRequired && biometric?.available && biometricEnabled ? <Pressable accessibilityRole="button" accessibilityLabel={`${biometric.label} bilan kirish`} onPress={() => void onBiometric()} style={({ pressed }) => [styles.biometric, pressed && styles.pressed]}>{busy ? <ActivityIndicator color={theme.primary} /> : <Ionicons name={biometric.icon} size={24} color={theme.primary} />}<Text style={styles.biometricText}>{biometric.label} bilan kirish</Text></Pressable> : <View style={styles.biometricSpacer} />}
        <View style={styles.keypad}>{DIGITS.map((digit, index) => digit ? <Pressable key={digit} accessibilityRole="button" accessibilityLabel={digit === "back" ? "O‘chirish" : digit} onPress={() => press(digit)} style={({ pressed }) => [styles.key, pressed && { backgroundColor: theme.primaryLight }]}><Text style={styles.keyText}>{digit === "back" ? "⌫" : digit}</Text></Pressable> : <View key={`empty-${index}`} style={styles.key} />)}</View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { flex: 1, alignItems: "center", padding: spacing.lg },
  icon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center", marginTop: spacing.xxl },
  title: { ...typography.headingLarge, color: theme.text, textAlign: "center", marginTop: spacing.md },
  description: { ...typography.bodySmall, color: theme.textSecondary, textAlign: "center", maxWidth: 290, marginTop: spacing.xs },
  progress: { flexDirection: "row", gap: 6, marginTop: spacing.lg },
  progressBar: { width: 32, height: 4, borderRadius: 4 },
  dots: { flexDirection: "row", gap: 14, marginTop: spacing.xl, minHeight: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  message: { ...typography.caption, textAlign: "center", marginTop: spacing.md },
  messageSpacer: { height: 28 },
  biometric: { minHeight: 62, alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
  biometricText: { ...typography.label, color: theme.primary },
  biometricSpacer: { height: 62 },
  keypad: { width: 250, marginTop: "auto", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", paddingBottom: spacing.md },
  key: { width: "33.33%", height: 56, alignItems: "center", justifyContent: "center", borderRadius: 16 },
  keyText: { color: theme.text, fontSize: 23, fontWeight: "600" },
  pressed: { opacity: 0.72 },
});
