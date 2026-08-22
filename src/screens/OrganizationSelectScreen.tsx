import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { AppTheme } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { useToast } from "../context/ToastContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { OrganizationCreateSheetContent } from "../modules/organization/components/OrganizationCreateSheetContent";
import { MAX_ORGANIZATIONS_PER_USER } from "../modules/organization/types";
import { OrganizationRequest } from "../modules/organization/types";
import { useBottomSheetBackHandler } from "../bottom-sheet";

const SHEET_SPRING = {
  damping: 80,
  stiffness: 500,
  mass: 0.8,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export function OrganizationSelectScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const {
    organizations,
    selectOrganization,
    createOrganizationForCurrentUser,
    refreshOrganizations,
    logout,
    isOrganizationLoading,
  } = useAuth();
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const createSheetRef = useRef<BottomSheetModal>(null);
  const createSnapPoints = useMemo(() => ["68%", "100%"], []);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const canCreateOrganization =
    organizations.length < MAX_ORGANIZATIONS_PER_USER;

  const handleCreateOrganization = useCallback(
    async (payload: OrganizationRequest) => {
      try {
        await createOrganizationForCurrentUser(payload);
        showToast("Yangi tashkilot yaratildi", "success");
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

  const closeCreateSheet = useCallback(() => {
    setIsCreateSheetOpen(false);
    Keyboard.dismiss();
    createSheetRef.current?.dismiss();
  }, []);

  useBottomSheetBackHandler(isCreateSheetOpen, closeCreateSheet);

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

  async function handleSelect(organizationId: number) {
    if (selectingId !== null) return;

    setSelectingId(organizationId);
    try {
      await selectOrganization(organizationId);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Tashkilotni tanlab bo'lmadi"),
        "error",
      );
    } finally {
      setSelectingId(null);
    }
  }

  async function handleRefresh() {
    try {
      await refreshOrganizations();
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Tashkilotlarni yangilab bo'lmadi"),
        "error",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={27} color={theme.primary} />
          </View>
          <Text style={styles.title}>Tashkilotni tanlang</Text>
          <Text style={styles.description}>
            Davom etish uchun ishlamoqchi bo'lgan tashkilotingizni tanlang.
          </Text>
        </View>

        <View style={styles.listCard}>
          {organizations.map((organization, index) => {
            const isSelecting = selectingId === organization.id;
            return (
              <Pressable
                key={organization.id}
                accessibilityRole="button"
                accessibilityLabel={`${organization.name} tashkilotini tanlash`}
                accessibilityState={{ disabled: selectingId !== null }}
                disabled={selectingId !== null}
                onPress={() => {
                  void handleSelect(organization.id);
                }}
                style={({ pressed }) => [
                  styles.organizationRow,
                  index < organizations.length - 1 && styles.rowBorder,
                  (pressed || isSelecting) && styles.rowPressed,
                ]}
              >
                <View style={styles.organizationIcon}>
                  <Ionicons name="storefront-outline" size={20} color={theme.primary} />
                </View>
                <View style={styles.organizationContent}>
                  <Text style={styles.organizationName} numberOfLines={1}>
                    {organization.name}
                  </Text>
                </View>
                {isSelecting ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.textMuted}
                  />
                )}
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          label={
            canCreateOrganization
              ? "Yangi tashkilot yaratish"
              : `Tashkilotlar limiti: ${MAX_ORGANIZATIONS_PER_USER}/${MAX_ORGANIZATIONS_PER_USER}`
          }
          onPress={() => {
            setIsCreateSheetOpen(true);
            createSheetRef.current?.present();
          }}
          variant="outline"
          disabled={!canCreateOrganization}
        />
        <Text style={styles.limitHint}>
          Siz {MAX_ORGANIZATIONS_PER_USER} tagacha tashkilot yaratishingiz mumkin
          ({organizations.length}/{MAX_ORGANIZATIONS_PER_USER}).
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tashkilotlar ro'yxatini yangilash"
          onPress={() => {
            void handleRefresh();
          }}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.rowPressed]}
        >
          {isOrganizationLoading ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={theme.textSecondary} />
          )}
          <Text style={styles.refreshText}>Ro'yxatni yangilash</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hisobdan chiqish"
          onPress={() => {
            void logout();
          }}
          style={({ pressed }) => [styles.logoutButton, pressed && styles.rowPressed]}
        >
          <Text style={styles.logoutText}>Hisobdan chiqish</Text>
        </Pressable>
      </ScrollView>
      <BottomSheetModal
        ref={createSheetRef}
        index={0}
        snapPoints={createSnapPoints}
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
          closeSheet={closeCreateSheet}
          onSubmit={handleCreateOrganization}
        />
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    content: {
      flexGrow: 1,
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      paddingHorizontal: 16,
      paddingVertical: 24,
      gap: 12,
    },
    header: { alignItems: "center", gap: 6, paddingBottom: 8 },
    headerIcon: {
      width: 62,
      height: 62,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 31,
      backgroundColor: theme.primaryLight,
    },
    title: {
      color: theme.text,
      fontSize: 23,
      lineHeight: 30,
      fontWeight: "800",
      letterSpacing: -0.4,
    },
    description: {
      maxWidth: 300,
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
    listCard: {
      overflow: "hidden",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    organizationRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 14,
      backgroundColor: theme.surface,
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.border },
    rowPressed: { opacity: 0.72 },
    organizationIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    organizationContent: { minWidth: 0, flex: 1 },
    organizationName: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
    },
    limitHint: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
    },
    refreshButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    refreshText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    logoutButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    logoutText: {
      color: theme.dangerColor,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
    },
  });
