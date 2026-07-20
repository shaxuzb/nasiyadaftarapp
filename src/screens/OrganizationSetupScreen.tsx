import React, { useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";

export function OrganizationSetupScreen() {
  const theme = useTheme();
  const { user, logout, createOrganizationForCurrentUser } = useAuth();
  const { showToast } = useToast();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["72%"], []);

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
    bottomSheetRef.current?.dismiss();
  }

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
    } catch {
      showToast("Tashkilot yaratishda xatolik", "error");
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
        enablePanDownToClose
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            appearsOnIndex={0}
            disappearsOnIndex={-1}
            opacity={0.35}
          />
        )}
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
      >
        <KeyboardAvoidingView style={styles.sheetKeyboardWrap} behavior="padding">
          <BottomSheetScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[typography.headingMedium, { color: theme.text }]}>
              Yangi tashkilot
            </Text>
            <Text
              style={[
                typography.bodySmall,
                {
                  color: theme.textSecondary,
                  marginTop: spacing.xs,
                  marginBottom: spacing.md,
                },
              ]}
            >
              Quyidagi ma'lumotlarni kiriting
            </Text>

            <AppInput
              label="Nomi *"
              value={name}
              onChangeText={setName}
              placeholder="Masalan: Nasiya Savdo"
              iconName="business-outline"
              error={errors.name}
            />

            <AppInput
              label="Telefon *"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+998 XX XXX XX XX"
              iconName="call-outline"
              keyboardType="phone-pad"
              mask={uzPhoneMask}
              error={errors.phoneNumber}
            />

            <AppInput
              label="Manzil"
              value={address}
              onChangeText={setAddress}
              placeholder="Shahar, ko'cha"
              iconName="location-outline"
            />

            <AppInput
              label="Izoh"
              value={note}
              onChangeText={setNote}
              placeholder="Ixtiyoriy"
              iconName="chatbubble-ellipses-outline"
              multiline
              numberOfLines={3}
              style={{ minHeight: 72, paddingTop: 10, textAlignVertical: "top" }}
            />

            <PrimaryButton
              label="Saqlash"
              onPress={handleCreateOrganization}
              loading={saving}
              style={{ marginTop: spacing.sm }}
            />

            <TouchableOpacity onPress={closeSheet} style={styles.cancelBtn}>
              <Text style={[typography.label, { color: theme.textMuted }]}>
                Bekor qilish
              </Text>
            </TouchableOpacity>
          </BottomSheetScrollView>
        </KeyboardAvoidingView>
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
    paddingBottom: spacing.xl,
  },
  sheetKeyboardWrap: {
    flex: 1,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
  },
});
