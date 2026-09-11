import React, { useMemo, useState } from "react";
import {
  Keyboard,
  ScrollViewProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";

import { AppInput } from "../../../components/AppInput";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useTheme } from "../../../hooks/useTheme";
import { OrganizationRequest } from "../types";
import { AppTheme } from "../../../types";
import { useTranslation } from "../../../i18n";

const KeyboardBottomSheetScrollView =
  BottomSheetScrollView as unknown as React.ComponentType<ScrollViewProps>;

interface Props {
  closeSheet: () => void;
  onSubmit: (payload: OrganizationRequest) => Promise<void>;
}

export function OrganizationCreateSheetContent({
  closeSheet,
  onSubmit,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setNameError(t("organization.nameError"));
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: normalizedName,
        address: address.trim(),
        note: note.trim(),
      });
      Keyboard.dismiss();
      closeSheet();
    } catch {
      // The parent owns API error presentation because the sheet portal is
      // rendered outside the AuthProvider and ToastProvider tree.
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.keyboardWrap}>
      <KeyboardAwareScrollView
        ScrollViewComponent={KeyboardBottomSheetScrollView}
        style={styles.keyboardScroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        bottomOffset={72}
        extraKeyboardSpace={16}
        disableScrollOnKeyboardHide={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t("organization.createSheetTitle")}</Text>
            <Text style={styles.description}>
              {t("organization.createSheetDescription")}
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("organization.closeLabel")}
            activeOpacity={0.72}
            disabled={saving}
            onPress={closeSheet}
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
          // autoFocus
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
          returnKeyType="next"
        />
        <AppInput
          variant="sheet"
          label={t("organization.noteLabel")}
          value={note}
          onChangeText={setNote}
          placeholder={t("organization.notePlaceholder")}
          iconName="chatbubble-ellipses-outline"
          multiline
          numberOfLines={3}
          returnKeyType="default"
          style={styles.noteInput}
        />

        <View style={styles.actions}>
          <Text style={styles.requiredHint}>{t("organization.requiredHint")}</Text>
          <PrimaryButton
            label={t("organization.createAction")}
            onPress={() => {
              void handleCreate();
            }}
            loading={saving}
            disabled={saving}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t("organization.cancel")}
            activeOpacity={0.72}
            disabled={saving}
            onPress={closeSheet}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>{t("organization.cancel")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keyboardWrap: { flex: 1 },
    keyboardScroll: { flex: 1 },
    content: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 28,
      gap: 0,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 10,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },
    headerCopy: { minWidth: 0, flex: 1, gap: 2 },
    title: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: "800",
    },
    description: { color: theme.textSecondary, fontSize: 12, lineHeight: 17 },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.inputBackground,
    },
    noteInput: { minHeight: 72, paddingTop: 10, textAlignVertical: "top" },
    actions: { gap: 8, marginTop: 4 },
    requiredHint: { color: theme.textMuted, fontSize: 11, lineHeight: 16 },
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
