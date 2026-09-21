import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAccountSecurity } from "../modules/account/context/AccountSecurityContext";
import { hasVerifiedPhone } from "../modules/account/utils/accountStatus";
import { openTelegramBot } from "../modules/bot/services/telegramBotService";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { ThemeMode, useThemeContext } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { AppTheme, RootStackParamList } from "../types";
import { useCurrentSubscription } from "../modules/subscription/hooks/useSubscription";
import { SubscriptionUpgradeModal } from "../modules/subscription/components/SubscriptionUpgradeModal";
import { useAdminContact } from "../modules/support/hooks/useAdminContact";
import {
  isPaidPlanCode,
  normalizePlanCode,
  type SubscriptionUpgradeReason,
} from "../modules/subscription/utils/upgradeOptions";
import { useOrganizationProfileUpdate } from "../modules/organization/hooks/useOrganizationProfileUpdate";
import type { UpdateCurrentOrganizationRequest } from "../modules/organization/types";
import { useBottomSheet } from "../bottom-sheet";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import type { TranslateKey } from "../i18n";
import { usePushNotifications } from "../modules/push/hooks/usePushNotifications";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Navigation = NativeStackNavigationProp<RootStackParamList>;

const THEME_OPTIONS: ReadonlyArray<{
  mode: ThemeMode;
  labelKey: TranslateKey;
  icon: IconName;
}> = [
  {
    mode: "system",
    labelKey: "profile.themeSystem",
    icon: "phone-portrait-outline",
  },
  { mode: "light", labelKey: "profile.themeLight", icon: "sunny-outline" },
  { mode: "dark", labelKey: "profile.themeDark", icon: "moon-outline" },
];

interface SectionTitleProps {
  title: string;
}

function SectionTitle({ title }: SectionTitleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

interface ProfileMenuRowProps {
  icon: IconName;
  iconColor: string;
  iconBackground: string;
  title: string;
  description?: string;
  onPress: () => void;
  isLast?: boolean;
  loading?: boolean;
  badge?: string;
}

function ProfileMenuRow({
  icon,
  iconColor,
  iconBackground,
  title,
  description,
  onPress,
  isLast = false,
  loading = false,
  badge,
}: ProfileMenuRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      accessibilityState={{ disabled: loading, busy: loading }}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        !isLast && styles.rowDivider,
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.menuDescription} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={styles.rowEnd}>
        {badge ? <Text style={styles.proBadge}>{badge}</Text> : null}
        {loading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
        )}
      </View>
    </Pressable>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { mode, setMode } = useThemeContext();
  const { locale, t } = useTranslation();
  const { openSheet } = useBottomSheet();
  const { user, currentOrganization, logout, openOrganizationSelector } =
    useAuth();
  const { permission: pushPermission } = usePushNotifications();
  const { saveOrganizationProfile } = useOrganizationProfileUpdate();
  const { openPhoneVerification, requireVerifiedPhone } = useAccountSecurity();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const { isOpening: isOpeningAdminContact, openAdminContact } =
    useAdminContact();
  const [isOpeningBot, setIsOpeningBot] = useState(false);
  const [upgradeReason, setUpgradeReason] =
    useState<SubscriptionUpgradeReason | null>(null);
  const subscriptionQuery = useCurrentSubscription();
  const subscription = subscriptionQuery.data ?? user?.subscription;
  const isAdministrator =
    user?.role === "Administrator" && user?.roleId === 2;
  const pushPermissionDescription =
    pushPermission === "granted"
      ? t("notifications.permissionGranted")
      : pushPermission === "denied"
        ? t("notifications.permissionDenied")
        : t("notifications.permissionUndetermined");
  const isPaidSubscription = isPaidPlanCode(subscription?.planCode);
  const telegramEnabled = subscription?.telegramBotEnabled !== false;
  const subscriptionName = subscription
    ? normalizePlanCode(subscription.planCode) === "FREE"
      ? t("subscription.freePlan")
      : normalizePlanCode(subscription.planCode) === "STANDARD"
        ? t("subscription.standardPlan")
        : normalizePlanCode(subscription.planCode) === "PREMIUM"
          ? t("subscription.premiumPlan")
          : subscription.planName
    : null;
  const subscriptionMeta = subscription
    ? [
        subscription.sms.totalRemaining === null
          ? t("profile.unlimitedSms")
          : t("profile.smsRemaining", {
              count: subscription.sms.totalRemaining,
            }),
        subscription.unlimitedOrganizations
          ? t("profile.unlimitedOrganizations")
          : t("profile.organizationsCount", {
              count: subscription.maxOrganizations ?? 0,
            }),
      ].join(" · ")
    : null;

  const phoneVerified = hasVerifiedPhone(user);
  const organizationStatusLabel = currentOrganization
    ? currentOrganization.stateId === 1
      ? t("profile.organizationActive")
      : currentOrganization.state || t("profile.organizationStatusUnknown")
    : t("profile.organizationNotSelected");

  const handleOrganizationSwitch = useCallback(async () => {
    try {
      await openOrganizationSelector();
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(
          error,
          "profile.switchOrganizationError",
          t,
        ),
        "error",
      );
    }
  }, [openOrganizationSelector, showToast, t]);

  const handleOrganizationProfileSave = useCallback(
    async (payload: UpdateCurrentOrganizationRequest) => {
      try {
        await saveOrganizationProfile(payload);
      } catch (error) {
        showToast(
          getLocalizedApiErrorMessage(error, "errors.generic", t),
          "error",
        );
        throw error;
      }
    },
    [saveOrganizationProfile, showToast, t],
  );

  const handleOrganizationEdit = useCallback(() => {
    if (!currentOrganization) {
      void handleOrganizationSwitch();
      return;
    }

    openSheet("organizationProfile", {
      organization: currentOrganization,
      onSubmit: handleOrganizationProfileSave,
    });
  }, [
    currentOrganization,
    handleOrganizationProfileSave,
    handleOrganizationSwitch,
    openSheet,
  ]);

  const handleOpenBot = useCallback(() => {
    if (isOpeningBot) return;

    requireVerifiedPhone(() => {
      setIsOpeningBot(true);
      void openTelegramBot()
        .catch((error: unknown) => {
          showToast(
            getLocalizedApiErrorMessage(error, "profile.botOpenError", t),
            "error",
          );
        })
        .finally(() => setIsOpeningBot(false));
    });
  }, [isOpeningBot, requireVerifiedPhone, showToast, t]);

  const handleOpenBlacklist = useCallback(() => {
    if (isPaidSubscription) {
      navigation.navigate("BlacklistSettings");
      return;
    }

    setUpgradeReason("blacklist");
  }, [isPaidSubscription, navigation]);

  const handleLogout = useCallback(async () => {
    const accepted = await confirm({
      title: t("profile.logoutTitle"),
      message: t("profile.logoutMessage"),
      confirmText: t("profile.logout"),
      cancelText: t("common.cancel"),
      variant: "danger",
    });
    if (!accepted) return;

    try {
      await logout();
      showToast(t("profile.logoutSuccess"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "profile.logoutError", t),
        "error",
      );
    }
  }, [confirm, logout, showToast, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>{t("profile.screenTitle")}</Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.profileCard}>
          <View style={styles.organizationHeader}>
            <View
              style={styles.organizationAvatar}
              accessibilityLabel={t("profile.organizationAvatarLabel")}
            >
              <Ionicons name="business-outline" size={27} color={theme.primary} />
            </View>
            <View style={styles.organizationIdentity}>
              <Text style={styles.organizationEyebrow}>
                {t("profile.currentOrganization")}
              </Text>
              <Text style={styles.profileName} numberOfLines={2}>
                {currentOrganization?.name || t("profile.organizationNotSelected")}
              </Text>
              <View style={styles.organizationStatusRow}>
                <View style={styles.organizationStatusDot} />
                <Text style={styles.organizationStatusText}>
                  {organizationStatusLabel}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.editOrganization")}
              accessibilityHint={t("profile.editOrganizationHint")}
              onPress={handleOrganizationEdit}
              style={({ pressed }) => [
                styles.organizationEdit,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="create-outline" size={21} color={theme.primary} />
            </Pressable>
          </View>

          <View style={styles.organizationContactDetails}>
            <View style={styles.organizationContactRow}>
              <Ionicons name="call-outline" size={18} color={theme.primary} />
              <View style={styles.organizationContactCopy}>
                <Text style={styles.organizationContactLabel}>
                  {t("profile.phone")}
                </Text>
                <Text selectable style={styles.organizationContactValue}>
                  {user?.phoneNumber || t("profile.notLinked")}
                </Text>
              </View>
            </View>
            <View style={styles.organizationContactDivider} />
            <View style={styles.organizationContactRow}>
              <Ionicons name="mail-outline" size={18} color={theme.primary} />
              <View style={styles.organizationContactCopy}>
                <Text style={styles.organizationContactLabel}>
                  {t("profile.email")}
                </Text>
                <Text
                  selectable
                  style={styles.organizationContactValue}
                  numberOfLines={2}
                >
                  {user?.email || t("profile.notLinked")}
                </Text>
              </View>
            </View>
          </View>

          {!isAdministrator && subscription ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.planLimits")}
              onPress={() => navigation.navigate("Subscription")}
              style={({ pressed }) => [
                styles.profilePlanRow,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.profilePlanIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={styles.profilePlanCopy}>
                <Text style={styles.profilePlanName} numberOfLines={2}>
                  {subscriptionName}
                </Text>
                <Text style={styles.profilePlanMeta} numberOfLines={2}>
                  {subscriptionMeta}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.textMuted}
              />
            </Pressable>
          ) : null}
        </View>

        <SectionTitle title={t("profile.accountSection")} />
        <View style={styles.card}>
          <ProfileMenuRow
            icon="call-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title={
              user?.phoneNumber
                ? t("profile.changePhone")
                : t("profile.linkPhone")
            }
            description={user?.phoneNumber || t("profile.phoneSecurityHint")}
            onPress={() => openPhoneVerification()}
          />
          <ProfileMenuRow
            icon="shield-checkmark-outline"
            iconColor={theme.warningColor}
            iconBackground={theme.inputBackground}
            title={t("profile.security")}
            description={t("profile.securityDescription")}
            onPress={() => navigation.navigate("AccountSecurity")}
            isLast={false}
          />
          <ProfileMenuRow
            icon="notifications-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title={t("notifications.permissionTitle")}
            description={pushPermissionDescription}
            onPress={() => navigation.navigate("NotificationSettings")}
            isLast={isAdministrator}
          />
          {!isAdministrator ? (
            <ProfileMenuRow
              icon="pricetags-outline"
              iconColor={theme.primary}
              iconBackground={theme.primaryLight}
              title={t("profile.planLimits")}
              description={t("profile.planLimitsDescription")}
              onPress={() => navigation.navigate("Subscription")}
              isLast
            />
          ) : null}
        </View>

        {!isAdministrator ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("profile.paymentHistory")}
            accessibilityHint={t("profile.paymentHistoryDescription")}
            onPress={() => navigation.navigate("PaymentHistory")}
            style={({ pressed }) => [
              styles.paymentHistoryCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.paymentHistoryIcon}>
              <Ionicons name="receipt-outline" size={20} color={theme.primary} />
            </View>
            <View style={styles.paymentHistoryCopy}>
              <Text style={styles.paymentHistoryTitle}>
                {t("profile.paymentHistory")}
              </Text>
              <Text style={styles.paymentHistoryHint} numberOfLines={2}>
                {t("profile.paymentHistoryDescription")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
        ) : null}

        <SectionTitle title={t("profile.organizationSection")} />
        <View style={styles.card}>
          <ProfileMenuRow
            icon="swap-horizontal-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title={t("organization.selectTitle")}
            onPress={() => {
              void handleOrganizationSwitch();
            }}
            isLast={false}
          />
          <ProfileMenuRow
            icon={
              isPaidSubscription ? "warning-outline" : "lock-closed-outline"
            }
            iconColor={
              isPaidSubscription ? theme.warningColor : theme.textSecondary
            }
            iconBackground={theme.inputBackground}
            title={t("profile.blacklistSettings")}
            description={
              isPaidSubscription
                ? t("profile.blacklistDescription")
                : t("profile.paidPlanAvailable")
            }
            onPress={handleOpenBlacklist}
            badge={
              isPaidSubscription ? undefined : t("subscription.standardPlan")
            }
            isLast
          />
        </View>

        <SectionTitle title={t("profile.helpSection")} />
        <View style={styles.card}>
          <ProfileMenuRow
            icon={telegramEnabled ? "send-outline" : "lock-closed-outline"}
            iconColor={telegramEnabled ? theme.primary : theme.textSecondary}
            iconBackground={
              telegramEnabled ? theme.primaryLight : theme.inputBackground
            }
            title={t("profile.telegramBot")}
            description={
              telegramEnabled
                ? phoneVerified
                  ? t("profile.telegramDescription")
                  : t("profile.verifyPhoneFirst")
                : t("profile.paidPlanAvailable")
            }
            onPress={
              telegramEnabled
                ? handleOpenBot
                : () => setUpgradeReason("telegram")
            }
            loading={telegramEnabled && isOpeningBot}
            badge={
              telegramEnabled ? undefined : t("subscription.standardPlan")
            }
          />
          <ProfileMenuRow
            icon="chatbubble-ellipses-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title={t("common.adminContactTitle")}
            description={t("common.adminContactDescription")}
            onPress={() => void openAdminContact()}
            loading={isOpeningAdminContact}
            isLast
          />
        </View>

        <SectionTitle title={t("profile.appearanceSection")} />
        <View style={styles.appearanceCard}>
          <ProfileMenuRow
            icon="language-outline"
            iconColor={theme.primary}
            iconBackground={theme.primaryLight}
            title={t("auth.language")}
            description={locale === "ru" ? t("auth.russian") : t("auth.uzbek")}
            onPress={() => openSheet("language", {})}
          />
          <View style={styles.themeSelector}>
            {THEME_OPTIONS.map((option) => {
              const active = mode === option.mode;
              return (
                <Pressable
                  key={option.mode}
                  accessibilityRole="button"
                  accessibilityLabel={t("profile.themeAccessibility", {
                    theme: t(option.labelKey),
                  })}
                  accessibilityState={{ selected: active }}
                  onPress={() => setMode(option.mode)}
                  style={({ pressed }) => [
                    styles.themeOption,
                    active && styles.themeOptionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={active ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeOptionText,
                      active && styles.themeOptionTextActive,
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("profile.logout")}
          onPress={() => {
            void handleLogout();
          }}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutPressed,
          ]}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={theme.dangerColor}
          />
          <Text style={styles.logoutText}>{t("profile.logout")}</Text>
        </Pressable>
      </ScrollView>
      <SubscriptionUpgradeModal
        visible={upgradeReason !== null}
        reason={upgradeReason ?? "telegram"}
        subscription={subscription}
        onClose={() => setUpgradeReason(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    screenTitle: { ...typography.displayMedium, color: theme.text },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    profileCard: {
      overflow: "hidden",
      padding: 14,
      gap: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.xl,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    organizationHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    organizationAvatar: {
      width: 56,
      height: 56,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: theme.primaryLight,
    },
    organizationIdentity: { minWidth: 0, flex: 1, gap: 3 },
    organizationEyebrow: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    profileName: { ...typography.headingMedium, color: theme.text },
    organizationStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    organizationStatusDot: {
      width: 7,
      height: 7,
      borderRadius: radius.full,
      backgroundColor: theme.paymentColor,
    },
    organizationStatusText: {
      ...typography.caption,
      color: theme.paymentColor,
      fontWeight: "700",
    },
    organizationEdit: {
      width: 42,
      height: 42,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    organizationContactDetails: {
      overflow: "hidden",
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.inputBackground,
    },
    organizationContactRow: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: spacing.sm,
    },
    organizationContactCopy: { minWidth: 0, flex: 1, gap: 1 },
    organizationContactLabel: {
      ...typography.caption,
      color: theme.textMuted,
    },
    organizationContactValue: {
      ...typography.label,
      color: theme.text,
      flexShrink: 1,
    },
    organizationContactDivider: {
      height: 1,
      marginLeft: 40,
      backgroundColor: theme.border,
    },
    profilePlanRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: `${theme.primary}44`,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.primaryLight,
    },
    profilePlanIcon: {
      width: 38,
      height: 38,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.surface,
    },
    profilePlanCopy: { minWidth: 0, flex: 1, gap: 2 },
    profilePlanName: {
      ...typography.label,
      color: theme.text,
      fontWeight: "800",
    },
    profilePlanMeta: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    paymentHistoryCard: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    paymentHistoryIcon: {
      width: 38,
      height: 38,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
    paymentHistoryCopy: { minWidth: 0, flex: 1, gap: 2 },
    paymentHistoryTitle: {
      ...typography.label,
      color: theme.text,
      fontWeight: "800",
    },
    paymentHistoryHint: { ...typography.caption, color: theme.textMuted },
    sectionHeader: { paddingTop: spacing.sm },
    sectionTitle: { ...typography.headingSmall, color: theme.text },
    card: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    appearanceCard: {
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    menuRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 13,
      paddingVertical: spacing.sm,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: theme.border },
    menuIcon: {
      width: 38,
      height: 38,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      borderCurve: "continuous",
    },
    menuCopy: { minWidth: 0, flex: 1, gap: 2 },
    menuTitle: {
      ...typography.label,
      color: theme.text,
      fontWeight: "700",
    },
    menuDescription: { ...typography.caption, color: theme.textMuted },
    rowEnd: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    proBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    themeSelector: {
      flexDirection: "row",
      gap: spacing.sm,
      padding: 6,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    themeOption: {
      minHeight: 48,
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: "transparent",
      borderRadius: radius.md,
      borderCurve: "continuous",
    },
    themeOptionActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    themeOptionText: { ...typography.labelSmall, color: theme.textSecondary },
    themeOptionTextActive: { color: theme.primary },
    logoutButton: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
      borderWidth: 1,
      borderColor: theme.debtBg,
      borderRadius: radius.lg,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
    },
    logoutText: {
      ...typography.label,
      color: theme.dangerColor,
      fontWeight: "700",
    },
    pressed: { opacity: 0.7 },
    disabled: { opacity: 0.55 },
    logoutPressed: { opacity: 0.65, backgroundColor: theme.debtBg },
  });
