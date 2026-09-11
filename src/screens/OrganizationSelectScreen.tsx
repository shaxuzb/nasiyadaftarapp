import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetBackdrop, BottomSheetModal } from "@gorhom/bottom-sheet";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import type { AppTheme, OrganizationStackParamList } from "../types";
import { useToast } from "../context/ToastContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { OrganizationCreateSheetContent } from "../modules/organization/components/OrganizationCreateSheetContent";
import { OrganizationRequest } from "../modules/organization/types";
import {
  canCreateOrganization,
  getOrganizationLimitLabel,
} from "../modules/subscription/utils/entitlements";
import { SubscriptionUpgradeModal } from "../modules/subscription/components/SubscriptionUpgradeModal";
import { useBottomSheetBackHandler } from "../bottom-sheet";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";

type Navigation = NativeStackNavigationProp<OrganizationStackParamList>;

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
  const navigation = useNavigation<Navigation>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    user,
    organizations,
    selectOrganization,
    createOrganizationForCurrentUser,
    refreshOrganizations,
    logout,
    cancelOrganizationSelection,
    isOrganizationLoading,
  } = useAuth();
  const [selectingId, setSelectingId] = useState<number | null>(null);
  const createSheetRef = useRef<BottomSheetModal>(null);
  const createSnapPoints = useMemo(() => ["68%", "100%"], []);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const canCreate = canCreateOrganization(
    user?.subscription,
    organizations.length,
  );
  const organizationLimitLabel = getOrganizationLimitLabel(
    user?.subscription,
    organizations.length,
  );

  const handleCreateOrganization = useCallback(
    async (payload: OrganizationRequest) => {
      try {
        await createOrganizationForCurrentUser(payload);
        showToast(t("organization.createSuccess"), "success");
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

  const closeCreateSheet = useCallback(() => {
    setIsCreateSheetOpen(false);
    Keyboard.dismiss();
    createSheetRef.current?.dismiss();
  }, []);

  const handleBack = useCallback(() => {
    Keyboard.dismiss();

    if (isCreateSheetOpen) {
      closeCreateSheet();
      return;
    }

    void cancelOrganizationSelection();
  }, [cancelOrganizationSelection, closeCreateSheet, isCreateSheetOpen]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (isCreateSheetOpen) return false;
        handleBack();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleBack, isCreateSheetOpen]);

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
        getLocalizedApiErrorMessage(error, "organization.selectError", t),
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
        getLocalizedApiErrorMessage(error, "organization.refreshError", t),
        "error",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("organization.back")}
          hitSlop={8}
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.rowPressed,
          ]}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
          <Text style={styles.backButtonText}>{t("organization.back")}</Text>
        </Pressable>
      </View>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="business-outline" size={27} color={theme.primary} />
          </View>
          <Text style={styles.title}>{t("organization.selectTitle")}</Text>
          <Text style={styles.description}>
            {t("organization.selectDescription")}
          </Text>
        </View>

        <View style={styles.listCard}>
          {organizations.map((organization, index) => {
            const isSelecting = selectingId === organization.id;
            return (
              <Pressable
                key={organization.id}
                accessibilityRole="button"
                accessibilityLabel={t("organization.selectOrganization", { name: organization.name })}
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
                  <Ionicons
                    name="storefront-outline"
                    size={20}
                    color={theme.primary}
                  />
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

        {canCreate ? (
          <PrimaryButton
            label={t("organization.create")}
            onPress={() => {
              setIsCreateSheetOpen(true);
              createSheetRef.current?.present();
            }}
            variant="outline"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("subscription.upgrade.viewPlans")}
            onPress={() => setIsUpgradeModalOpen(true)}
            style={({ pressed }) => [
              styles.upgradeButton,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.upgradeButtonIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={theme.primary}
              />
            </View>
            <View style={styles.upgradeButtonCopy}>
              <Text style={styles.upgradeButtonTitle}>
                {t("organization.limitTitle")}
              </Text>
              <Text style={styles.upgradeButtonSubtitle}>
                {t("organization.limitDescription")}
              </Text>
            </View>
            <Text style={styles.proBadge}>{t("subscription.standardPlan")}</Text>
          </Pressable>
        )}
        <Text style={styles.limitHint}>
          {t("organization.limitHint", { limit: organizationLimitLabel })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("organization.refresh")}
          onPress={() => {
            void handleRefresh();
          }}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.rowPressed,
          ]}
        >
          {isOrganizationLoading ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <Ionicons
              name="refresh-outline"
              size={18}
              color={theme.textSecondary}
            />
          )}
          <Text style={styles.refreshText}>{t("organization.refresh")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("organization.logout")}
          onPress={() => {
            void logout();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.rowPressed,
          ]}
        >
          <Text style={styles.logoutText}>{t("organization.logout")}</Text>
        </Pressable>
      </ScrollView>
      <BottomSheetModal
        ref={createSheetRef}
        index={0}
        snapPoints={createSnapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        enableOverDrag={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
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
      <SubscriptionUpgradeModal
        visible={isUpgradeModalOpen}
        reason="organization-limit"
        subscription={user?.subscription}
        onClose={() => setIsUpgradeModalOpen(false)}
        onViewSubscription={() => navigation.navigate("Subscription")}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    topBar: {
      minHeight: 52,
      justifyContent: "center",
      paddingHorizontal: 12,
    },
    backButton: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 2,
      paddingHorizontal: 4,
      borderRadius: 12,
    },
    backButtonText: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "700",
    },
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
    upgradeButton: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },
    upgradeButtonIcon: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.surface,
    },
    upgradeButtonCopy: { minWidth: 0, flex: 1, gap: 1 },
    upgradeButtonTitle: { color: theme.text, fontSize: 14, fontWeight: "800" },
    upgradeButtonSubtitle: { color: theme.textSecondary, fontSize: 11 },
    proBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      color: theme.primary,
      fontSize: 11,
      fontWeight: "800",
      backgroundColor: theme.surface,
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
