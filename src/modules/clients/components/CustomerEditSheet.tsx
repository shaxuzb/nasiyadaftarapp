import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardController } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import { AppInput } from "../../../components/AppInput";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { useTheme } from "../../../hooks/useTheme";
import { useToast } from "../../../context/ToastContext";
import { useBottomSheetBackHandler } from "../../../bottom-sheet";
import { AndroidSheetKeyboardBridge } from "../../../bottom-sheet/AndroidSheetKeyboardBridge";
import {
  formatUzPhoneFromDigits,
  isValidUzPhone,
  toStoredUzPhone,
} from "../../../utils/masks";
import { hapticSuccess } from "../../../utils/haptics";
import type { ClientUpdateRequest, Customer } from "../types";
import type { AppTheme } from "../../../types";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";

interface Props {
  customer: Customer;
  onSave: (payload: ClientUpdateRequest) => Promise<void>;
  onClose: () => void;
}

export function CustomerEditSheet({ customer, onSave, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { showToast } = useToast();
  const sheet = useRef<BottomSheetModal>(null);
  const phoneRef = useRef<TextInput>(null);
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(customer.fullName);
  const [phone, setPhone] = useState(formatUzPhoneFromDigits(customer.phone));
  const [note, setNote] = useState(customer.note ?? "");
  const [phoneError, setPhoneError] = useState<string>();
  const changed =
    name.trim() !== customer.fullName ||
    toStoredUzPhone(phone) !== customer.phone ||
    note.trim() !== (customer.note ?? "");
  const handlePhoneChange = useCallback((value: string) => {
    setPhone(formatUzPhoneFromDigits(value));
    setPhoneError(undefined);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => sheet.current?.present());
    return () => cancelAnimationFrame(frame);
  }, []);
  const close = useCallback(() => {
    if (submitting.current) return;
    void KeyboardController.dismiss();
    sheet.current?.dismiss();
  }, []);
  useBottomSheetBackHandler(true, close);
  const backdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.4}
        pressBehavior={saving ? "none" : "close"}
      />
    ),
    [saving],
  );

  async function save() {
    if (submitting.current) return;
    if (!isValidUzPhone(phone)) {
      setPhoneError(t("transactions.phoneIncomplete"));
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await onSave({
        fullName: name.trim().replace(/\s+/g, " "),
        phoneNumber: toStoredUzPhone(phone),
        note: note.trim(),
      });
      void KeyboardController.dismiss();
      hapticSuccess();
      showToast(t("transactions.updated"), "success");
      sheet.current?.dismiss();
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "transactions.updateError", t),
        "error",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <BottomSheetModal
      ref={sheet}
      enableDynamicSizing
      maxDynamicContentSize={Math.max(1, height - insets.top - 24)}
      topInset={insets.top}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustPan"
      enableBlurKeyboardOnGesture
      enablePanDownToClose={!saving}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={!saving}
      backdropComponent={backdrop}
      onDismiss={() => {
        void KeyboardController.dismiss();
        onClose();
      }}
      backgroundStyle={styles.background}
      handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
    >
      <BottomSheetScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 12) + 8 },
        ]}
      >
        <AndroidSheetKeyboardBridge />
        <View style={styles.header}>
          <Text style={styles.title}>{t("transactions.editTitle")}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("transactions.close")}
            disabled={saving}
            onPress={close}
            style={styles.close}
          >
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        </View>
        <AppInput
          variant="sheet"
          compact
          label={t("customers.name")}
          value={name}
          onChangeText={setName}
          editable={!saving}
          autoCapitalize="words"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => phoneRef.current?.focus()}
        />
        <AppInput
          variant="sheet"
          compact
          inputRef={phoneRef}
          label={t("customers.phoneRequired")}
          uncontrolled
          defaultValue={phone}
          transformText={formatUzPhoneFromDigits}
          onChangeText={handlePhoneChange}
          editable={!saving}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={phoneError}
        />
        <AppInput
          variant="sheet"
          compact
          label={t("transactions.note")}
          value={note}
          onChangeText={setNote}
          editable={!saving}
          placeholder={t("transactions.editNotePlaceholder")}
          multiline
          style={styles.note}
        />
        <PrimaryButton
          label={t("common.save")}
          onPress={save}
          loading={saving}
          disabled={!changed || !isValidUzPhone(phone)}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    background: { backgroundColor: theme.surface, borderRadius: 26 },
    content: { paddingHorizontal: 16, gap: 16 },
    header: { flexDirection: "row", alignItems: "center" },
    title: { flex: 1, color: theme.text, fontSize: 19, fontWeight: "700" },
    close: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    note: { minHeight: 76, paddingVertical: 12, textAlignVertical: "top" },
  });
