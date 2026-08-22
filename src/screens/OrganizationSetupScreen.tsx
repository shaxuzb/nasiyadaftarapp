import React, { useCallback, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScreenContainer } from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { OrganizationCreateSheetContent } from "../modules/organization/components/OrganizationCreateSheetContent";
import { OrganizationRequest } from "../modules/organization/types";
import { radius, spacing, typography } from "../theme";
import { getApiErrorMessage } from "../utils/apiError";
import { useBottomSheetBackHandler } from "../bottom-sheet";

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
  const insets = useSafeAreaInsets();
  const { user, logout, createOrganizationForCurrentUser } = useAuth();
  const { showToast } = useToast();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["68%", "100%"], []);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

  const closeSheet = useCallback(() => {
    setIsCreateSheetOpen(false);
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }, []);

  useBottomSheetBackHandler(isCreateSheetOpen, closeSheet);

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

  const handleCreateOrganization = useCallback(
    async (payload: OrganizationRequest) => {
      try {
        await createOrganizationForCurrentUser(payload);
        showToast("Tashkilot yaratildi", "success");
      } catch (error) {
        showToast(
          getApiErrorMessage(error, "Tashkilot yaratishda xatolik"),
          "error",
        );
        throw error;
      }
    },
    [createOrganizationForCurrentUser, showToast],
  );

  return (
    <ScreenContainer style={styles.screen} scrollable={false}>
      <View style={styles.container}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
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
            Assalomu alaykum {user?.fullName ?? ""}, boshlash uchun birinchi
            tashkilotingizni yarating.
          </Text>
          <PrimaryButton
            label="Tashkilot yaratish"
            onPress={() => {
              setIsCreateSheetOpen(true);
              bottomSheetRef.current?.present();
            }}
            style={styles.createButton}
          />
          <PrimaryButton
            label="Chiqish"
            onPress={() => {
              void logout();
            }}
            variant="outline"
            style={styles.logoutButton}
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
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        animationConfigs={SHEET_SPRING}
        onChange={(index) => setIsCreateSheetOpen(index >= 0)}
        onDismiss={() => {
          setIsCreateSheetOpen(false);
          Keyboard.dismiss();
        }}
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
      >
        <OrganizationCreateSheetContent
          closeSheet={closeSheet}
          onSubmit={handleCreateOrganization}
        />
      </BottomSheetModal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1 },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    justifyContent: "center",
  },
  card: {
    alignItems: "center",
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.xl,
  },
  iconWrap: {
    width: 66,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    borderRadius: radius.full,
  },
  description: { marginTop: spacing.xs, textAlign: "center" },
  createButton: { marginTop: spacing.md },
  logoutButton: { marginTop: spacing.sm },
});
