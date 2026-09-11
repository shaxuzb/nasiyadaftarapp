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
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../../hooks/useTheme";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { formatCurrency } from "../../../utils";
import { useSmsPackages, useSubscriptionPlans } from "../hooks/useSubscription";
import type {
  CurrentSubscription,
  SmsPackage,
  SubscriptionPlan,
} from "../types";
import {
  getSubscriptionUpgradeOptions,
  type SubscriptionUpgradeIcon,
  type SubscriptionUpgradeReason,
} from "../utils/upgradeOptions";
import { useAdminContact } from "../../support/hooks/useAdminContact";
import { useBottomSheetBackHandler } from "../../../bottom-sheet";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const UPGRADE_ICONS: Record<SubscriptionUpgradeIcon, IconName> = {
  sms: "chatbubble-ellipses-outline",
  telegram: "paper-plane-outline",
  blacklist: "shield-checkmark-outline",
  organization: "storefront-outline",
};

function stepIcon(icon: SubscriptionUpgradeIcon, index: number): IconName {
  if (icon === "telegram") {
    return ["call-outline", "business-outline", "document-text-outline"][
      index
    ] as IconName;
  }

  if (icon === "organization") return "sparkles-outline";
  return "checkmark";
}

interface SubscriptionUpgradeModalProps {
  visible: boolean;
  reason: SubscriptionUpgradeReason;
  subscription?: CurrentSubscription;
  onClose: () => void;
  onViewSubscription: () => void;
}

function priceLabel(price: number) {
  return price === 0 ? "Hozircha bepul" : `${formatCurrency(price)} so'm`;
}

function proPlan(plans: SubscriptionPlan[]): SubscriptionPlan | undefined {
  return plans.find((plan) => plan.code.toUpperCase() === "PRO");
}

export function SubscriptionUpgradeModal({
  visible,
  reason,
  subscription,
  onClose,
  onViewSubscription,
}: SubscriptionUpgradeModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const contentBottomInset = Math.max(insets.bottom, spacing.md) + 10;
  const sheet = useRef<BottomSheetModal>(null);
  const presentedRef = useRef(false);
  const viewSubscriptionAfterDismissRef = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const plansQuery = useSubscriptionPlans();
  const packagesQuery = useSmsPackages();
  const { isOpening, openAdminContact } = useAdminContact();
  const [selectedPackage, setSelectedPackage] = useState<SmsPackage | null>(
    null,
  );
  const [showPackageCatalog, setShowPackageCatalog] = useState(false);
  const options = getSubscriptionUpgradeOptions(subscription, reason);
  const plan = proPlan(plansQuery.data ?? []);
  const packages = packagesQuery.data ?? [];

  const closeSheet = useCallback(() => {
    if (!presentedRef.current) {
      onClose();
      return;
    }
    sheet.current?.dismiss();
  }, [onClose]);

  const handleDismiss = useCallback(() => {
    presentedRef.current = false;
    const shouldNavigate = viewSubscriptionAfterDismissRef.current;
    viewSubscriptionAfterDismissRef.current = false;
    onClose();
    if (shouldNavigate) {
      requestAnimationFrame(onViewSubscription);
    }
  }, [onClose, onViewSubscription]);

  useBottomSheetBackHandler(visible, closeSheet);

  useEffect(() => {
    if (!visible) {
      if (presentedRef.current) {
        sheet.current?.dismiss();
      }
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      if (!visibleRef.current) return;
      presentedRef.current = true;
      sheet.current?.present();
    });
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setSelectedPackage(null);
    setShowPackageCatalog(false);
  }, [reason, visible]);

  useEffect(() => {
    if (!visible) return;
    setSelectedPackage((current) =>
      packages.some((item) => item.id === current?.id) ? current : null,
    );
  }, [packages, visible]);

  const openAdmin = useCallback(async () => {
    await openAdminContact();
    closeSheet();
  }, [closeSheet, openAdminContact]);

  const openSubscription = useCallback(() => {
    if (!presentedRef.current) {
      onClose();
      onViewSubscription();
      return;
    }

    viewSubscriptionAfterDismissRef.current = true;
    sheet.current?.dismiss();
  }, [onClose, onViewSubscription]);

  const renderFooter = useCallback(
    (footerProps: BottomSheetFooterProps) => {
      if (!selectedPackage) return null;

      return (
        <BottomSheetFooter {...footerProps} bottomInset={contentBottomInset}>
          <View style={styles.stickyAction}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedPackage.name} uchun administrator bilan bog'lanish`}
              accessibilityState={{ disabled: isOpening, busy: isOpening }}
              disabled={isOpening}
              onPress={() => void openAdmin()}
              style={({ pressed }) => [
                styles.packageAction,
                pressed && styles.pressed,
                isOpening && styles.disabled,
              ]}
            >
              {isOpening ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={19}
                  color={theme.primary}
                />
              )}
              <Text style={styles.packageActionText}>
                {selectedPackage.name} uchun admin bilan bog'lanish
              </Text>
            </Pressable>
          </View>
        </BottomSheetFooter>
      );
    },
    [
      contentBottomInset,
      isOpening,
      openAdmin,
      selectedPackage,
      styles,
      theme.primary,
    ],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.54}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheet}
      index={0}
      enableDynamicSizing
      maxDynamicContentSize={Math.max(1, height - insets.top - spacing.md)}
      topInset={insets.top}
      enablePanDownToClose
      enableOverDrag={false}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      stackBehavior="replace"
      footerComponent={renderFooter}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        enableFooterMarginAdjustment
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.body,
          {
            paddingBottom: selectedPackage ? spacing.md : contentBottomInset,
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={UPGRADE_ICONS[options.icon]}
              size={27}
              color={theme.primary}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Yopish"
            onPress={closeSheet}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={21} color={theme.textSecondary} />
          </Pressable>
        </View>
        <Text style={styles.title}>{options.title}</Text>
        <Text style={styles.description}>{options.description}</Text>
        {options.showQuota && subscription?.sms ? (
          <View style={styles.quotaCard}>
            <View style={styles.quotaItem}>
              <Text style={styles.quotaLabel}>Oylik limit</Text>
              <Text style={styles.quotaValue}>
                {subscription.sms.monthlyLimit === null
                  ? "∞"
                  : subscription.sms.monthlyLimit}
              </Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaItem}>
              <Text style={styles.quotaLabel}>Qoldi</Text>
              <Text style={styles.quotaValue}>
                {subscription.sms.monthlyRemaining === null
                  ? "∞"
                  : subscription.sms.monthlyRemaining}
              </Text>
            </View>
          </View>
        ) : null}
        {options.steps.length ? (
          <View style={styles.steps}>
            {options.steps.map((item, index) => (
              <View key={item} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  <Ionicons
                    name={stepIcon(options.icon, index)}
                    size={21}
                    color={theme.primary}
                  />
                </View>
                {options.icon === "telegram" ? (
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                ) : null}
                <Text style={styles.stepText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}
        {options.showPro ? (
          <UpgradeCard
            title={plan?.name ?? "PRO tarifi"}
            subtitle={
              plan
                ? `${plan.monthlySmsLimit ?? "Ko'proq"} SMS / oy · Telegram bot · Qora ro'yxat`
                : "Ko'proq SMS, Telegram bot va qora ro'yxat"
            }
            price={priceLabel(plan?.price ?? 0)}
            icon="rocket-outline"
            selected
            actionLabel="PRO tarifini ko'rish"
            onPress={openSubscription}
            loading={isOpening}
            theme={theme}
            styles={styles}
          />
        ) : null}

        {options.showPackages ? (
          showPackageCatalog ? (
            <View style={styles.packagesSection}>
              <Text style={styles.sectionTitle}>SMS paketini tanlang</Text>
              {packagesQuery.isPending ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.loadingText}>
                    Paketlar yuklanmoqda...
                  </Text>
                </View>
              ) : packages.length ? (
                <View style={styles.packageGrid}>
                  {packages.map((item) => {
                    const selected = selectedPackage?.id === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.name} paketini tanlash`}
                        accessibilityState={{ selected }}
                        onPress={() => setSelectedPackage(item)}
                        style={({ pressed }) => [
                          styles.packageCard,
                          selected && styles.packageCardSelected,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={styles.packageIcon}>
                          <Ionicons
                            name="mail-outline"
                            size={21}
                            color={theme.primary}
                          />
                        </View>
                        <Text
                          style={[
                            styles.packageCount,
                            selected && styles.packageCountSelected,
                          ]}
                        >
                          {item.smsCount}
                        </Text>
                        <Text style={styles.packageLabel}>SMS</Text>
                        <Text style={styles.packagePrice}>
                          {priceLabel(item.price)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.loadingText}>Paketlar topilmadi.</Text>
              )}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="SMS paketlarini ko'rish"
              onPress={() => setShowPackageCatalog(true)}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="mail-outline" size={21} color={theme.primary} />
              <Text style={styles.secondaryActionText}>
                SMS paketlarini ko'rish
              </Text>
              <Ionicons name="arrow-forward" size={18} color={theme.primary} />
            </Pressable>
          )
        ) : null}
        {showPackageCatalog && options.showPackages ? (
          <Text style={styles.note}>
            Tanlovni administrator bilan kelishasiz. To'lov API ulangach shu
            oynaning o'zidan xarid qilinadi.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Hozir emas"
          onPress={closeSheet}
          style={({ pressed }) => [
            styles.dismissAction,
            pressed && styles.pressed,
            {
              paddingBottom: selectedPackage ? spacing.md : contentBottomInset,
            },
          ]}
        >
          <Text style={styles.dismissActionText}>Hozir emas</Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function UpgradeCard({
  title,
  subtitle,
  price,
  icon,
  selected,
  actionLabel,
  onPress,
  loading,
  theme,
  styles,
}: {
  title: string;
  subtitle: string;
  price: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  selected?: boolean;
  actionLabel: string;
  onPress: () => void;
  loading: boolean;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.proCard, selected && styles.proCardSelected]}>
      <View style={styles.proTop}>
        <View style={styles.proIcon}>
          <Ionicons name={icon} size={22} color={theme.primary} />
        </View>
        <View style={styles.proCopy}>
          <Text style={styles.proTitle}>{title}</Text>
          <Text style={styles.proSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.proPrice}>{price}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        accessibilityState={{ disabled: loading, busy: loading }}
        disabled={loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.proAction,
          pressed && styles.pressed,
          loading && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Text style={styles.proActionText}>{actionLabel}</Text>
            <Ionicons name="arrow-forward" size={17} color="#fff" />
          </>
        )}
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderBottomLeftRadius: radius.xl,
      borderBottomRightRadius: radius.xl,
      borderCurve: "continuous",
    },
    handleIndicator: {
      width: 38,
      height: 4,
      borderRadius: radius.full,
      backgroundColor: theme.textMuted,
      opacity: 0.5,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    iconWrap: {
      width: 58,
      height: 58,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      backgroundColor: theme.primaryLight,
    },
    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    title: {
      ...typography.headingLarge,
      color: theme.text,
    },
    description: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    body: {
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    steps: {
      gap: spacing.sm,
    },
    stepRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    stepIcon: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },
    stepNumber: {
      width: 28,
      height: 28,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    stepNumberText: {
      ...typography.label,
      color: theme.primary,
      fontWeight: "800",
    },
    stepText: {
      flex: 1,
      ...typography.bodySmall,
      color: theme.text,
    },
    quotaCard: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      borderRadius: radius.lg,
      backgroundColor: theme.primaryLight,
    },
    quotaItem: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    quotaLabel: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    quotaValue: {
      ...typography.headingMedium,
      color: theme.text,
      fontWeight: "800",
    },
    quotaDivider: {
      width: 1,
      height: 42,
      backgroundColor: `${theme.primary}33`,
    },
    proCard: {
      padding: 14,
      gap: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    proCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    proTop: { flexDirection: "row", gap: 10 },
    proIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.surface,
    },
    proCopy: { minWidth: 0, flex: 1, gap: 2 },
    proTitle: { ...typography.headingSmall, color: theme.text },
    proSubtitle: { ...typography.caption, color: theme.textSecondary },
    proPrice: { ...typography.label, color: theme.primary, fontWeight: "800" },
    proAction: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: theme.primary,
    },
    proActionText: {
      ...typography.labelSmall,
      color: "#fff",
      fontWeight: "800",
    },
    packagesSection: { gap: spacing.sm },
    sectionTitle: { ...typography.label, color: theme.text, fontWeight: "800" },
    loadingRow: {
      minHeight: 84,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    loadingText: { ...typography.caption, color: theme.textMuted },
    packageGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    packageCard: {
      width: "48%",
      minHeight: 122,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.surfaceElevated,
    },
    packageIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    packageCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    packageCount: {
      fontSize: 24,
      lineHeight: 29,
      fontWeight: "800",
      color: theme.text,
    },
    packageCountSelected: { color: theme.primary },
    packageLabel: { ...typography.caption, color: theme.textSecondary },
    packagePrice: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    packageAction: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    packageActionText: {
      ...typography.labelSmall,
      color: theme.primary,
      fontWeight: "800",
    },
    secondaryAction: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1.5,
      borderColor: theme.primary,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
    },
    secondaryActionText: {
      ...typography.label,
      color: theme.primary,
      fontWeight: "800",
    },
    stickyAction: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    note: {
      marginTop: spacing.md,
      textAlign: "center",
      ...typography.caption,
      color: theme.textMuted,
    },
    dismissAction: {
      alignSelf: "center",
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    dismissActionText: {
      ...typography.label,
      color: theme.primary,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.56 },
  });
