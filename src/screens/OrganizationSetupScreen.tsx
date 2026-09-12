import React, { useCallback, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
  KeyboardAvoidingView,
} from "react-native-keyboard-controller";

import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import { useTheme } from "../hooks/useTheme";
import { buildOrganizationSetupPayload } from "../modules/organization/utils/organizationSetup";
import type { OrganizationRequest } from "../modules/organization/types";
import { radius, spacing, typography } from "../theme";
import type { AppTheme } from "../types";

export function OrganizationSetupScreen() {
  const theme = useTheme();
  const styles = useStyles(theme);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { logout, createOrganizationForCurrentUser } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true,
      );

      return () => subscription.remove();
    }, []),
  );

  const handleCreateOrganization = useCallback(
    async (payload: OrganizationRequest) => {
      try {
        await createOrganizationForCurrentUser(payload);
        showToast(t("organization.created"), "success");
      } catch (error) {
        showToast(
          getLocalizedApiErrorMessage(error, "organization.createError", t),
          "error",
        );
        throw error;
      }
    },
    [createOrganizationForCurrentUser, showToast, t],
  );

  const handleCreate = useCallback(async () => {
    const payload = buildOrganizationSetupPayload(name);

    if (!payload) {
      setNameError(t("organization.nameError"));
      return;
    }

    setNameError(undefined);
    setIsSaving(true);

    try {
      await handleCreateOrganization(payload);
    } catch {
      // The shared auth handler already presents the localized error toast.
    } finally {
      setIsSaving(false);
    }
  }, [handleCreateOrganization, name, t]);

  return (
    <ScreenContainer style={styles.screen} scrollable={false} padded={false}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <KeyboardAwareScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          bottomOffset={24}
          extraKeyboardSpace={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: theme.primaryLight },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={30}
                  color={theme.primary}
                />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {t("organization.setupTitle")}
              </Text>
              <Text
                style={[styles.description, { color: theme.textSecondary }]}
              >
                {t("organization.setupDescription")}
              </Text>

              <View style={styles.form}>
                <AppInput
                  label={t("organization.nameLabel")}
                  value={name}
                  onChangeText={(value) => {
                    setName(value);
                    if (nameError) setNameError(undefined);
                  }}
                  placeholder={t("organization.namePlaceholder")}
                  iconName="business-outline"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleCreate()}
                  error={nameError}
                />
                <PrimaryButton
                  label={t("organization.createAction")}
                  onPress={() => void handleCreate()}
                  loading={isSaving}
                  disabled={!name.trim() || isSaving}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("organization.setupLogout")}
                accessibilityState={{ disabled: isSaving }}
                onPress={() => void logout()}
                disabled={isSaving}
                hitSlop={8}
                style={styles.switchAccount}
              >
                <Text
                  style={[styles.switchAccountText, { color: theme.primary }]}
                >
                  {t("organization.setupLogout")}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const useStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1 },
    flex: { flex: 1 },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.md,
    },
    container: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
    },
    card: {
      padding: spacing.lg,
      borderWidth: 1,
      borderRadius: radius.xl,
    },
    iconWrap: {
      width: 66,
      height: 66,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: spacing.md,
      borderRadius: radius.full,
    },
    title: {
      ...typography.headingLarge,
      textAlign: "center",
    },
    description: {
      ...typography.bodySmall,
      marginTop: spacing.xs,
      textAlign: "center",
    },
    form: {
      marginTop: spacing.lg,
    },
    switchAccount: {
      alignSelf: "center",
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
    },
    switchAccountText: {
      ...typography.label,
    },
  });
