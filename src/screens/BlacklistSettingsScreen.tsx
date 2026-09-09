import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import {
  useCurrentOrganization,
  useUpdateBlacklistSettings,
} from "../modules/organization/hooks/useBlacklistSettings";
import { parseBlacklistDays } from "../modules/organization/utils/blacklistSettings";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";

type Nav = NativeStackNavigationProp<RootStackParamList>;
export function BlacklistSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const currentOrganization = useCurrentOrganization();
  const [value, setValue] = useState("");
  const [savedValue, setSavedValue] = useState<number | null>(null);
  const update = useUpdateBlacklistSettings();
  const serverDays = currentOrganization.data?.blacklistAfterDays;
  useEffect(() => {
    if (typeof serverDays !== "number") return;
    setValue(String(serverDays));
    setSavedValue(serverDays);
  }, [serverDays]);
  const parsed = parseBlacklistDays(value);
  const valid = parsed !== null;
  const changed = savedValue !== null && parsed !== savedValue;
  const isLoadingOrganization =
    currentOrganization.isPending && !currentOrganization.data;
  const save = async () => {
    if (!valid || !changed || update.isPending) return;
    try {
      await update.mutateAsync({ blacklistAfterDays: parsed });
      setSavedValue(parsed);
      showToast("Qora ro'yxat sozlamasi saqlandi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Sozlamani saqlab bo'lmadi"),
        "error",
      );
    }
  };
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Orqaga qaytish"
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={styles.title}>Qora ro'yxat</Text>
          <View style={styles.headerButton} />
        </View>
        <KeyboardAwareScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bottomOffset={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={27}
                  color={theme.warningColor}
                />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Avtomatik nazorat</Text>
                <Text style={styles.description}>
                  Belgilangan muddatdan oshgan qarzdorlar tashkilot qora
                  ro'yxatida ko'rsatiladi.
                </Text>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>Necha kundan keyin</Text>
              {isLoadingOrganization ? (
                <View style={styles.loadingField}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.help}>Joriy sozlama yuklanmoqda...</Text>
                </View>
              ) : (
                <>
                  <View style={[styles.field, !valid && styles.fieldError]}>
                    <TextInput
                      value={value}
                      onChangeText={(text) =>
                        setValue(text.replace(/\D/g, "").slice(0, 4))
                      }
                      keyboardType="number-pad"
                      returnKeyType="none"
                      selectionColor={theme.primary}
                      style={styles.input}
                      accessibilityLabel="Qora ro'yxatga tushish kunlari"
                    />
                    <Text style={styles.suffix}>kun</Text>
                  </View>
                  {!valid ? (
                    <Text style={styles.error}>
                      1 dan 3650 gacha butun kun kiriting.
                    </Text>
                  ) : (
                    <Text style={styles.help}>
                      Qiymat current organization sozlamasidan olindi.
                    </Text>
                  )}
                </>
              )}
              {currentOrganization.isError ? (
                <Text style={styles.error}>
                  Joriy sozlamani yuklab bo'lmadi. Qayta urinib ko'ring.
                </Text>
              ) : null}
            </View>
            <View style={styles.warning}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={theme.warningColor}
              />
              <Text style={styles.warningText}>
                Muddatni o'zgartirish kechikkan mijozlarning tasnifiga ta'sir
                qiladi.
              </Text>
            </View>
          </View>
        </KeyboardAwareScrollView>
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <PrimaryButton
            label="Saqlash"
            loading={update.isPending}
            disabled={isLoadingOrganization || !valid || !changed}
            onPress={() => void save()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      ...typography.headingLarge,
      color: theme.text,
    },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    content: { padding: spacing.md, gap: spacing.md },
    hero: {
      flexDirection: "row",
      gap: 12,
      padding: 14,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    heroIcon: {
      width: 46,
      height: 46,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    heroCopy: { flex: 1, gap: 3 },
    heroTitle: { ...typography.headingSmall, color: theme.text },
    description: { ...typography.bodySmall, color: theme.textSecondary },
    card: {
      gap: spacing.sm,
      padding: 14,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    label: { ...typography.label, color: theme.text },
    field: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    fieldError: { borderColor: theme.dangerColor },
    loadingField: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    input: {
      flex: 1,
      paddingHorizontal: 14,
      color: theme.text,
      fontSize: 22,
      fontWeight: "700",
    },
    suffix: {
      paddingHorizontal: 14,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
      ...typography.label,
      color: theme.textSecondary,
    },
    help: { ...typography.caption, color: theme.textMuted },
    error: { ...typography.caption, color: theme.dangerColor },
    warning: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    warningText: { flex: 1, ...typography.caption, color: theme.textSecondary },
    footer: {
      padding: spacing.md,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
  });
