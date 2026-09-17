import React, { useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { AppInput } from "../../components/AppInput";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import type { AppTheme } from "../../types";
import { AndroidSheetKeyboardBridge } from "../AndroidSheetKeyboardBridge";
import type { SheetRenderProps } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OrganizationProfileSheet({
  closeSheet,
  setDismissLocked,
  props,
}: SheetRenderProps<"organizationProfile">) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState(props.organization.name);
  const [address, setAddress] = useState(props.organization.address ?? "");
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() =>
    Platform.OS === "android" ? Keyboard.isVisible() : false,
  );

  useEffect(() => {
    setDismissLocked(saving);
    return () => setDismissLocked(false);
  }, [saving, setDismissLocked]);

  useEffect(() => {
    if (Platform.OS !== "android") return undefined;

    const showSubscription = Keyboard.addListener("keyboardDidShow", () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function handleSave() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setNameError(t("organization.nameError"));
      return;
    }

    setSaving(true);
    try {
      await props.onSubmit({
        name: normalizedName,
        address: address.trim(),
      });
      Keyboard.dismiss();
      closeSheet();
    } catch {
      // Parent callback owns API error presentation.
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheetScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: keyboardVisible ? 0 : insets.bottom,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <AndroidSheetKeyboardBridge />
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="business-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("profile.organizationSection")}</Text>
          <Text style={styles.description} numberOfLines={2}>
            {props.organization.name}
          </Text>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          disabled={saving}
          onPress={() => closeSheet()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={21} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <AppInput
        variant="sheet"
        label={t("organization.nameLabel")}
        value={name}
        onChangeText={(value) => {
          setName(value);
          if (nameError) setNameError(undefined);
        }}
        placeholder={t("organization.namePlaceholder")}
        iconName="business-outline"
        autoCapitalize="words"
        returnKeyType="next"
        error={nameError}
      />

      <AppInput
        variant="sheet"
        label={t("organization.addressLabel")}
        value={address}
        onChangeText={setAddress}
        placeholder={t("organization.addressPlaceholder")}
        iconName="location-outline"
        autoCapitalize="sentences"
        returnKeyType="done"
      />

      <View style={styles.actions}>
        <PrimaryButton
          label={t("common.save")}
          onPress={() => void handleSave()}
          loading={saving}
          disabled={saving}
        />
        <TouchableOpacity
          accessibilityRole="button"
          disabled={saving}
          onPress={() => closeSheet()}
          style={styles.cancelButton}
        >
          <Text style={styles.cancelText}>{t("common.cancel")}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    scroll: { flexGrow: 0 },
    content: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    headerIcon: {
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    headerCopy: { flex: 1, minWidth: 0, gap: 2 },
    title: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
    },
    description: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    actions: { gap: 8, marginTop: 8 },
    cancelButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    cancelText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
  });
