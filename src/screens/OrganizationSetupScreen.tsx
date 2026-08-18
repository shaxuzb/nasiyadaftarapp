import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  ScrollViewProps,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { ScreenContainer } from "../components/ScreenContainer";
import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isValidUzPhone, toStoredUzPhone, uzPhoneMask } from "../utils/masks";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import { getApiErrorMessage } from "../utils/apiError";

const KeyboardBottomSheetScrollView =
  BottomSheetScrollView as unknown as React.ComponentType<ScrollViewProps>;

const SHEET_SPRING = {
  damping: 80,
  stiffness: 500,
  mass: 0.8,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export function OrganizationSetupScreen() {
  const theme = useTheme();
  const { user, logout, createOrganizationForCurrentUser } = useAuth();
  const { showToast } = useToast();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["86%"], []);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("+998 ");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phoneNumber?: string }>(
    {},
  );

  function openSheet() {
    bottomSheetRef.current?.present();
  }

  function closeSheet() {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );

  function validate() {
    const next: { name?: string; phoneNumber?: string } = {};

    if (!name.trim()) {
      next.name = "Tashkilot nomini kiriting";
    }

    if (!isValidUzPhone(phoneNumber)) {
      next.phoneNumber = "Telefon raqam noto'g'ri";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreateOrganization() {
    if (!validate()) {
      showToast("Formani to'liq kiriting", "error");
      return;
    }

    setSaving(true);
    try {
      await createOrganizationForCurrentUser({
        name: name.trim(),
        phoneNumber: toStoredUzPhone(phoneNumber),
        address: address.trim(),
        note: note.trim(),
      });

      closeSheet();
      showToast("Tashkilot yaratildi", "success");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Tashkilot yaratishda xatolik"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer style={{ flexGrow: 1 }} scrollable={false}>
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}
          >
            <Ionicons name="business-outline" size={30} color={theme.primary} />
          </View>

          <Text style={[typography.headingLarge, { color: theme.text }]}>
            Tashkilotni yarating
          </Text>
          <Text
            style={[
              typography.bodySmall,
              styles.description,
              { color: theme.textSecondary },
            ]}
          >
            Assalomu alaykum {user?.fullName ?? ""}, davom etish uchun avval
            tashkilot ma'lumotini kiriting.
          </Text>

          <PrimaryButton
            label="Tashkilot yaratish"
            onPress={openSheet}
            style={{ marginTop: spacing.md }}
          />
          <PrimaryButton
            label="Chiqish"
            onPress={() => {
              void logout();
            }}
            variant="outline"
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableOverDrag={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
        backdropComponent={renderBackdrop}
        animationConfigs={SHEET_SPRING}
        onDismiss={Keyboard.dismiss}
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
      >
        <View style={styles.sheetKeyboardWrap}>
          <KeyboardAwareScrollView
            ScrollViewComponent={KeyboardBottomSheetScrollView}
            style={styles.sheetKeyboardScroll}
            bottomOffset={72}
            extraKeyboardSpace={16}
            disableScrollOnKeyboardHide={false}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.sheetHeaderIcon,
                  { backgroundColor: theme.primaryLight },
                ]}
              >
                <Ionicons
                  name="business-outline"
                  size={22}
                  color={theme.primary}
                />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={[typography.headingMedium, { color: theme.text }]}>
                  Yangi tashkilot
                </Text>
                <Text
                  style={[typography.bodySmall, { color: theme.textSecondary }]}
                >
                  Tashkilot ma'lumotlarini kiriting
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Tashkilot formasini yopish"
                activeOpacity={0.72}
                onPress={closeSheet}
                style={[
                  styles.sheetCloseButton,
                  { backgroundColor: theme.inputBackground },
                ]}
              >
                <Ionicons name="close" size={21} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <AppInput
              variant="sheet"
              label="Nomi *"
              value={name}
              onChangeText={(value) => {
                setName(value);
                if (errors.name) {
                  setErrors((current) => ({ ...current, name: undefined }));
                }
              }}
              placeholder="Masalan: Nasiya Savdo"
              iconName="business-outline"
              autoCapitalize="words"
              returnKeyType="next"
              error={errors.name}
            />

            <AppInput
              variant="sheet"
              label="Telefon *"
              value={phoneNumber}
              onChangeText={(value) => {
                setPhoneNumber(value);
                if (errors.phoneNumber) {
                  setErrors((current) => ({
                    ...current,
                    phoneNumber: undefined,
                  }));
                }
              }}
              placeholder="+998 XX XXX XX XX"
              iconName="call-outline"
              keyboardType="phone-pad"
              mask={uzPhoneMask}
              error={errors.phoneNumber}
            />

            <AppInput
              variant="sheet"
              label="Manzil"
              value={address}
              onChangeText={setAddress}
              placeholder="Shahar, ko'cha"
              iconName="location-outline"
              autoCapitalize="sentences"
              returnKeyType="next"
            />

            <AppInput
              variant="sheet"
              label="Izoh"
              value={note}
              onChangeText={setNote}
              placeholder="Ixtiyoriy"
              iconName="chatbubble-ellipses-outline"
              multiline
              numberOfLines={3}
              returnKeyType="default"
              style={{
                minHeight: 72,
                paddingTop: 10,
                textAlignVertical: "top",
              }}
            />

            <View style={styles.sheetActions}>
              <Text style={[typography.caption, { color: theme.textMuted }]}>
                * Majburiy maydonlar
              </Text>
              <PrimaryButton
                label="Tashkilotni saqlash"
                onPress={handleCreateOrganization}
                loading={saving}
                disabled={saving}
              />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Bekor qilish"
                activeOpacity={0.72}
                onPress={closeSheet}
                style={styles.cancelBtn}
              >
                <Text style={[typography.label, { color: theme.textMuted }]}>
                  Bekor qilish
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
          <KeyboardToolbar
            doneText="Tayyor"
            showArrows
            onDoneCallback={Keyboard.dismiss}
          />
        </View>
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: "center",
  },
  iconWrap: {
    width: 66,
    height: 66,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  description: {
    textAlign: "center",
    marginTop: spacing.xs,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  sheetKeyboardWrap: {
    flex: 1,
  },
  sheetKeyboardScroll: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHeaderText: {
    flex: 1,
    gap: 2,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
