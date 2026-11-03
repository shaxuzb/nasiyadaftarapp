import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
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
import { useSheetFrameStyle } from "../../../hooks/useSheetFrameStyle";
import { useDismissSheetOnAppLock } from "../../../bottom-sheet/useDismissSheetOnAppLock";
import { useToast } from "../../../context/ToastContext";
import { useBottomSheetBackHandler } from "../../../bottom-sheet";
import { AndroidSheetKeyboardBridge } from "../../../bottom-sheet/AndroidSheetKeyboardBridge";
import {
  formatUzPhoneFromDigits,
  isOptionalUzPhoneValid,
  toOptionalStoredUzPhone,
} from "../../../utils/masks";
import { hapticSuccess } from "../../../utils/haptics";
import { useContactPicker } from "../hooks/useContactPicker";
import type { ClientUpdateRequest, Customer } from "../types";
import type { AppTheme } from "../../../types";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";

interface Props {
  customer: Customer;
  ready?: boolean;
  dataState?: "ready" | "loading" | "error";
  onSave: (payload: ClientUpdateRequest) => Promise<void>;
  onClose: () => void;
}

export function CustomerEditSheet({
  customer,
  ready = true,
  dataState = "ready",
  onSave,
  onClose,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { showToast } = useToast();
  const sheet = useRef<BottomSheetModal>(null);
  const sheetFrame = useSheetFrameStyle();
  // Must not stay open on top of the PIN screen, and must not be "closed"
  // while it is not open: see useDismissSheetOnAppLock.
  const sheetControls = useDismissSheetOnAppLock(sheet);
  const phoneRef = useRef<TextInput>(null);
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(customer.fullName);
  const [phone, setPhone] = useState(formatUzPhoneFromDigits(customer.phone));
  // The phone field keeps its own text while typing; this puts a new number
  // into it (a contact picked, the customer reloaded).
  const [phoneResetKey, setPhoneResetKey] = useState(0);
  const [phoneError, setPhoneError] = useState<string>();
  const previousDataState = useRef(dataState);
  const pickContact = useContactPicker();
  // The phone is optional, as it is when a customer is added: empty is a
  // valid value, and clearing the field removes the number. Only a number
  // that was started and left unfinished is an error.
  const changed =
    name.trim() !== customer.fullName ||
    toOptionalStoredUzPhone(phone) !== customer.phone;
  const handlePhoneChange = useCallback((value: string) => {
    setPhone(formatUzPhoneFromDigits(value));
    setPhoneError(undefined);
  }, []);

  useEffect(() => {
    if (previousDataState.current !== "ready" && dataState === "ready") {
      setName(customer.fullName);
      setPhone(formatUzPhoneFromDigits(customer.phone));
      setPhoneResetKey((key) => key + 1);
      setPhoneError(undefined);
    }
    previousDataState.current = dataState;
  }, [customer, dataState]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => sheetControls.present());
    return () => cancelAnimationFrame(frame);
  }, [sheetControls]);
  const close = useCallback(() => {
    if (submitting.current) return;
    void KeyboardController.dismiss();
    sheetControls.dismiss();
  }, [sheetControls]);
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

  async function fillFromContact() {
    phoneRef.current?.blur();
    const contact = await pickContact();
    if (!contact) return;
    // What the contact has replaces its field; what it lacks stays as it is.
    if (contact.fullName) setName(contact.fullName);
    if (contact.phone) {
      setPhone(formatUzPhoneFromDigits(contact.phone));
      setPhoneResetKey((key) => key + 1);
    }
    setPhoneError(undefined);
    showToast(t("customers.contactsFilled"), "success");
  }

  async function save() {
    if (submitting.current || !ready || dataState !== "ready") return;
    if (!isOptionalUzPhoneValid(phone)) {
      setPhoneError(t("transactions.phoneIncomplete"));
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await onSave({
        fullName: name.trim().replace(/\s+/g, " "),
        phoneNumber: toOptionalStoredUzPhone(phone),
        // Not edited here any more, but sent as it is so saving never
        // clears a note the customer already has.
        note: customer.note ?? "",
      });
      void KeyboardController.dismiss();
      hapticSuccess();
      showToast(t("transactions.updated"), "success");
      sheetControls.dismiss();
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
      // A centred column on a tablet, like the screen behind it.
      style={sheetFrame}
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
        sheetControls.handleDismissed();
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
          inputResetKey={phoneResetKey}
          label={t("customers.phoneOptional")}
          uncontrolled
          defaultValue={phone}
          transformText={formatUzPhoneFromDigits}
          onChangeText={handlePhoneChange}
          placeholder={t("customers.phonePlaceholder")}
          editable={!saving}
          keyboardType="phone-pad"
          autoComplete="tel"
          error={phoneError}
          trailingAccessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("customers.contactPicker")}
              accessibilityHint={t("customers.contactPickerHint")}
              disabled={saving}
              hitSlop={4}
              onPress={() => void fillFromContact()}
              style={({ pressed }) => [styles.contactPicker, pressed && styles.pressed]}
            >
              <Ionicons name="people-outline" size={23} color={theme.primary} />
            </Pressable>
          }
        />
        {dataState === "loading" ? (
          <View style={styles.dataStatus}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={styles.dataStatusText}>{t("common.loading")}</Text>
          </View>
        ) : dataState === "error" ? (
          <Text style={styles.dataError}>{t("transactions.dataLoadError")}</Text>
        ) : null}
        <PrimaryButton
          label={t("common.save")}
          onPress={save}
          loading={saving || dataState === "loading"}
          disabled={
            !ready ||
            dataState !== "ready" ||
            !changed ||
            !isOptionalUzPhoneValid(phone)
          }
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
    // The same button as when a customer is added.
    contactPicker: {
      width: 44,
      height: 44,
      marginRight: -8,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { opacity: 0.7 },
    dataStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dataStatusText: { color: theme.textMuted, fontSize: 12 },
    dataError: { color: theme.dangerColor, fontSize: 12 },
  });
