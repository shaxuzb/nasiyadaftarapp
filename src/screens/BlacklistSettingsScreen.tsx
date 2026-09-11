import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { EmptyState } from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useCurrentSubscription } from "../modules/subscription/hooks/useSubscription";
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";

type Nav = NativeStackNavigationProp<RootStackParamList>;
export function BlacklistSettingsScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { user } = useAuth();
  const subscriptionQuery = useCurrentSubscription();
  const subscription = subscriptionQuery.data ?? user?.subscription;
  const currentOrganization = useCurrentOrganization();
  const [value, setValue] = useState("");
  const [savedValue, setSavedValue] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
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
  if (subscription?.blacklistEnabled === false) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={styles.title}>{t("organization.blacklistTitle")}</Text>
          <View style={styles.headerButton} />
        </View>
        <EmptyState
          iconName="lock-closed-outline"
          title={t("organization.blacklistDisabledTitle")}
          description={t("organization.blacklistDisabledDescription")}
        />
      </SafeAreaView>
    );
  }
  const save = async () => {
    if (!valid || !changed || update.isPending) return;
    try {
      await update.mutateAsync({ blacklistAfterDays: parsed });
      setSavedValue(parsed);
      showToast(t("organization.blacklistSaved"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "organization.blacklistSaveError", t),
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
            accessibilityLabel={t("common.back")}
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={styles.title}>{t("organization.blacklistTitle")}</Text>
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
                <Text style={styles.heroTitle}>{t("organization.blacklistHeroTitle")}</Text>
                <Text style={styles.description}>
                  {t("organization.blacklistHeroDescription")}
                </Text>
              </View>
            </View>
            <View style={styles.card}>
              <Text style={styles.label}>{t("organization.blacklistDaysLabel")}</Text>
              {isLoadingOrganization ? (
                <View style={styles.loadingField}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.help}>{t("organization.blacklistLoading")}</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => inputRef.current?.focus()}
                    style={[
                      styles.field,
                      !valid && styles.fieldError,
                      focused && valid && styles.fieldFocused,
                    ]}
                  >
                    <TextInput
                      ref={inputRef}
                      value={value}
                      onChangeText={(text) =>
                        setValue(text.replace(/\D/g, "").slice(0, 4))
                      }
                      keyboardType="number-pad"
                      returnKeyType="none"
                      selectionColor={theme.primary}
                      style={styles.input}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      accessibilityLabel={t("organization.blacklistInputLabel")}
                    />
                    <Text style={styles.suffix}>{t("organization.days")}</Text>
                  </Pressable>
                  {!valid ? (
                    <Text style={styles.error}>
                      {t("organization.blacklistValidation")}
                    </Text>
                  ) : (
                    <Text style={styles.help}>
                      {t("organization.blacklistServerHelp")}
                    </Text>
                  )}
                </>
              )}
              {currentOrganization.isError ? (
                <Text style={styles.error}>
                  {t("organization.blacklistLoadError")}
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
                {t("organization.blacklistWarning")}
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
            label={t("common.save")}
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
    fieldFocused: { borderColor: theme.primary, borderWidth: 1.5 },
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
