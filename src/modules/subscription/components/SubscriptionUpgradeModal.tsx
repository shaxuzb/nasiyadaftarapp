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
  ScrollView,
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
import {
  formatLocalizedCurrency,
  type Translate,
  useTranslation,
} from "../../../i18n";
import { useSmsPackages, useSubscriptionPlans } from "../hooks/useSubscription";
import type {
  CurrentSubscription,
  SmsPackage,
  SubscriptionPlan,
} from "../types";
import {
  getSubscriptionUpgradeOptions,
  isPaidPlanCode,
  normalizePlanCode,
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

function priceLabel(price: number, locale: "uz" | "ru", freeLabel: string) {
  return price === 0 ? freeLabel : formatLocalizedCurrency(price, locale);
}

type CatalogPlanCode = "FREE" | "STANDARD" | "PREMIUM";

interface PlanComparisonRow {
  label: string;
  freeValue?: string;
  selectedValue?: string;
  freeEnabled?: boolean;
  selectedEnabled?: boolean;
}

function localizedPlanName(plan: SubscriptionPlan, t: Translate) {
  const code = normalizePlanCode(plan.code);
  if (code === "FREE") return t("subscription.freePlan");
  if (code === "STANDARD") return t("subscription.standardPlan");
  if (code === "PREMIUM") return t("subscription.premiumPlan");
  return plan.name;
}

function localizedPlanDescription(plan: SubscriptionPlan, t: Translate) {
  const code = normalizePlanCode(plan.code);
  if (code === "FREE") return t("subscription.freePlanDescription");
  if (code === "STANDARD") {
    return t("subscription.standardPlanDescription");
  }
  if (code === "PREMIUM") return t("subscription.premiumPlanDescription");
  return plan.description;
}

function planIcon(code: string): IconName {
  if (normalizePlanCode(code) === "PREMIUM") return "diamond-outline";
  if (normalizePlanCode(code) === "STANDARD") return "rocket-outline";
  return "storefront-outline";
}

function planLimitValue(
  value: number | null,
  t: Translate,
  unit: "sms" | "organization",
) {
  if (value === null) return t("subscription.unlimited");
  return unit === "sms"
    ? t("subscription.smsCount", { count: value })
    : t("subscription.organizationCount", { count: value });
}

function planComparisonRows(
  freePlan: SubscriptionPlan,
  selectedPlan: SubscriptionPlan,
  t: Translate,
): PlanComparisonRow[] {
  return [
    {
      label: t("subscription.featureSmsLimit"),
      freeValue: planLimitValue(freePlan.monthlySmsLimit, t, "sms"),
      selectedValue: planLimitValue(selectedPlan.monthlySmsLimit, t, "sms"),
    },
    {
      label: t("subscription.featureOrganizations"),
      freeValue: planLimitValue(freePlan.maxOrganizations, t, "organization"),
      selectedValue: planLimitValue(
        selectedPlan.maxOrganizations,
        t,
        "organization",
      ),
    },
    {
      label: t("subscription.featureTelegram"),
      freeEnabled: freePlan.telegramBotEnabled,
      selectedEnabled: selectedPlan.telegramBotEnabled,
    },
    {
      label: t("subscription.featureBlacklist"),
      freeEnabled: freePlan.blacklistEnabled,
      selectedEnabled: selectedPlan.blacklistEnabled,
    },
    {
      label: t("subscription.featureTransactionSms"),
      freeEnabled: freePlan.transactionSmsEnabled,
      selectedEnabled: selectedPlan.transactionSmsEnabled,
    },
    {
      label: t("subscription.featurePrioritySupport"),
      freeEnabled: freePlan.prioritySupportEnabled,
      selectedEnabled: selectedPlan.prioritySupportEnabled,
    },
  ];
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
  const { locale, t } = useTranslation();
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
  const baseOptions = getSubscriptionUpgradeOptions(subscription, reason);
  const isPremium = normalizePlanCode(subscription?.planCode) === "PREMIUM";
  const options = useMemo(() => {
    if (reason === "telegram") {
      return {
        ...baseOptions,
        title: t("subscription.upgrade.telegramTitle"),
        description: t("subscription.upgrade.telegramDescription"),
        steps: [
          t("subscription.upgrade.telegramStepPhone"),
          t("subscription.upgrade.telegramStepOrganization"),
          t("subscription.upgrade.telegramStepReport"),
        ],
      };
    }
    if (reason === "organization-limit") {
      return {
        ...baseOptions,
        title: t("subscription.upgrade.organizationTitle"),
        description: t("subscription.upgrade.organizationDescription"),
        steps: [t("subscription.upgrade.organizationStep")],
      };
    }
    if (reason === "blacklist") {
      return {
        ...baseOptions,
        title: t("subscription.upgrade.blacklistTitle"),
        description: t("subscription.upgrade.blacklistDescription"),
        steps: [
          t("subscription.upgrade.blacklistStepDeadline"),
          t("subscription.upgrade.blacklistStepMark"),
          t("subscription.upgrade.blacklistStepOther"),
        ],
      };
    }
    return {
      ...baseOptions,
      title: t("subscription.upgrade.smsTitle"),
      description: t(
        isPremium
          ? "subscription.upgrade.smsDescriptionPaid"
          : "subscription.upgrade.smsDescription",
      ),
      steps: [],
    };
  }, [baseOptions, isPremium, reason, t]);
  const planCatalog = useMemo(() => {
    const order: Record<CatalogPlanCode, number> = {
      FREE: 0,
      STANDARD: 1,
      PREMIUM: 2,
    };
    return [...(plansQuery.data ?? [])]
      .filter((item) => {
        const code = normalizePlanCode(item.code);
        return code === "FREE" || isPaidPlanCode(code);
      })
      .sort((left, right) => {
        const leftCode = normalizePlanCode(left.code) as CatalogPlanCode;
        const rightCode = normalizePlanCode(right.code) as CatalogPlanCode;
        return order[leftCode] - order[rightCode];
      });
  }, [plansQuery.data]);
  const [selectedPlanCode, setSelectedPlanCode] =
    useState<CatalogPlanCode>("PREMIUM");
  const freePlan = useMemo(
    () =>
      planCatalog.find((item) => normalizePlanCode(item.code) === "FREE") ??
      null,
    [planCatalog],
  );
  const selectedPlan = useMemo(
    () =>
      planCatalog.find(
        (item) => normalizePlanCode(item.code) === selectedPlanCode,
      ) ?? null,
    [planCatalog, selectedPlanCode],
  );
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
    if (!visible || !planCatalog.length) return;
    const preferred = planCatalog.some(
      (item) => normalizePlanCode(item.code) === "PREMIUM",
    )
      ? "PREMIUM"
      : planCatalog.some((item) => normalizePlanCode(item.code) === "STANDARD")
        ? "STANDARD"
        : "FREE";
    setSelectedPlanCode(preferred);
  }, [planCatalog, visible]);

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
              accessibilityLabel={t("subscription.packageContact", {
                name: selectedPackage.name,
              })}
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
                {t("subscription.packageContact", {
                  name: selectedPackage.name,
                })}
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
      t,
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
            accessibilityLabel={t("subscription.close")}
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
              <Text style={styles.quotaLabel}>
                {t("subscription.upgrade.quotaMonthly")}
              </Text>
              <Text style={styles.quotaValue}>
                {subscription.sms.monthlyLimit === null
                  ? "∞"
                  : subscription.sms.monthlyLimit}
              </Text>
            </View>
            <View style={styles.quotaDivider} />
            <View style={styles.quotaItem}>
              <Text style={styles.quotaLabel}>
                {t("subscription.upgrade.quotaRemaining")}
              </Text>
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
        {options.showPlans ? (
          planCatalog.length && freePlan && selectedPlan ? (
            <View style={styles.plansSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.planSelector}
              >
                {planCatalog.map((item) => {
                  const code = normalizePlanCode(item.code) as CatalogPlanCode;
                  const selected = code === selectedPlanCode;
                  const current =
                    Boolean(subscription) &&
                    code === normalizePlanCode(subscription?.planCode);
                  return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="tab"
                      accessibilityLabel={localizedPlanName(item, t)}
                      accessibilityState={{ selected }}
                      onPress={() => setSelectedPlanCode(code)}
                      style={({ pressed }) => [
                        styles.planTab,
                        selected && styles.planTabSelected,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.planTabText,
                          selected && styles.planTabTextSelected,
                        ]}
                      >
                        {localizedPlanName(item, t)}
                      </Text>
                      {current ? (
                        <Text
                          style={[
                            styles.planTabCaption,
                            selected && styles.planTabCaptionSelected,
                          ]}
                        >
                          {t("subscription.current")}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>

              <PlanComparisonCard
                selectedPlan={selectedPlan}
                selectedIsCurrent={
                  Boolean(subscription) &&
                  normalizePlanCode(selectedPlan.code) ===
                    normalizePlanCode(subscription?.planCode)
                }
                price={priceLabel(
                  selectedPlan.price,
                  locale,
                  t("subscription.freePrice"),
                )}
                rows={planComparisonRows(freePlan, selectedPlan, t)}
                planName={localizedPlanName(selectedPlan, t)}
                planDescription={localizedPlanDescription(selectedPlan, t)}
                recommended={
                  normalizePlanCode(selectedPlan.code) ===
                  options.recommendedPlanCode
                }
                actionLabel={t("subscription.adminActivate")}
                onPress={() => void openAdmin()}
                loading={isOpening}
                theme={theme}
                styles={styles}
                t={t}
              />
            </View>
          ) : plansQuery.isPending ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={styles.loadingText}>
                {t("subscription.loadingPlans")}
              </Text>
            </View>
          ) : null
        ) : null}

        {options.showPlans ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("subscription.upgrade.viewPlans")}
            onPress={openSubscription}
            style={({ pressed }) => [
              styles.plansLink,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.plansLinkText}>
              {t("subscription.upgrade.viewPlans")}
            </Text>
            <Ionicons name="arrow-forward" size={17} color={theme.primary} />
          </Pressable>
        ) : null}

        {options.showPackages ? (
          showPackageCatalog ? (
            <View style={styles.packagesSection}>
              <Text style={styles.sectionTitle}>
                {t("subscription.packageSelect")}
              </Text>
              {packagesQuery.isPending ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={styles.loadingText}>
                    {t("subscription.quotaLoading")}
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
                        accessibilityLabel={`${item.name} ${t("subscription.packageSelect")}`}
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
                          {priceLabel(
                            item.price,
                            locale,
                            t("subscription.freePrice"),
                          )}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.loadingText}>
                  {t("subscription.packageNotFound")}
                </Text>
              )}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("subscription.packageCatalog")}
              onPress={() => setShowPackageCatalog(true)}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="mail-outline" size={21} color={theme.primary} />
              <Text style={styles.secondaryActionText}>
                {t("subscription.packageCatalog")}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={theme.primary} />
            </Pressable>
          )
        ) : null}
        {showPackageCatalog && options.showPackages ? (
          <Text style={styles.note}>{t("subscription.packageNote")}</Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("subscription.nowNot")}
          onPress={closeSheet}
          style={({ pressed }) => [
            styles.dismissAction,
            pressed && styles.pressed,
            {
              paddingBottom: selectedPackage ? spacing.md : contentBottomInset,
            },
          ]}
        >
          <Text style={styles.dismissActionText}>
            {t("subscription.nowNot")}
          </Text>
        </Pressable>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function PlanComparisonCard({
  selectedPlan,
  rows,
  planName,
  planDescription,
  price,
  selectedIsCurrent,
  recommended,
  actionLabel,
  onPress,
  loading,
  theme,
  styles,
  t,
}: {
  selectedPlan: SubscriptionPlan;
  rows: ReadonlyArray<PlanComparisonRow>;
  planName: string;
  planDescription: string;
  price: string;
  selectedIsCurrent: boolean;
  recommended: boolean;
  actionLabel: string;
  onPress: () => void;
  loading: boolean;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
  t: Translate;
}) {
  return (
    <View
      style={[
        styles.planCard,
        recommended && styles.planCardSelected,
        selectedIsCurrent && styles.planCardCurrent,
      ]}
    >
      <View style={styles.planTop}>
        <View style={styles.planIcon}>
          <Ionicons
            name={planIcon(selectedPlan.code)}
            size={22}
            color={theme.primary}
          />
        </View>
        <View style={styles.planCopy}>
          <View style={styles.planTitleRow}>
            <Text style={styles.planTitle}>{planName}</Text>
            {recommended ? (
              <Text style={styles.recommendedLabel}>
                {t("subscription.recommended")}
              </Text>
            ) : null}
          </View>
          <Text style={styles.planSubtitle}>{planDescription}</Text>
        </View>
      </View>
      <Text style={styles.planPrice}>{price}</Text>
      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>
          {t("subscription.comparisonTitle")}
        </Text>
        <View style={styles.comparisonHeader}>
          <Text style={styles.comparisonFeatureHeader} />
          <Text style={styles.comparisonColumn}>
            {t("subscription.freePlan")}
          </Text>
          <Text style={styles.comparisonColumn}>{planName}</Text>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>{row.label}</Text>
            <ComparisonCell
              value={row.freeValue}
              enabled={row.freeEnabled}
              theme={theme}
              styles={styles}
            />
            <ComparisonCell
              value={row.selectedValue}
              enabled={row.selectedEnabled}
              theme={theme}
              styles={styles}
            />
          </View>
        ))}
      </View>
      {selectedIsCurrent ? (
        <View style={styles.currentPlanNotice}>
          <Ionicons
            name="checkmark-circle"
            size={19}
            color={theme.successColor}
          />
          <Text style={styles.currentPlanNoticeText}>
            {t("subscription.current")}
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: loading, busy: loading }}
          disabled={loading}
          onPress={onPress}
          style={({ pressed }) => [
            styles.planAction,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.planActionText}>{actionLabel}</Text>
              <Ionicons name="arrow-forward" size={17} color="#fff" />
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

function ComparisonCell({
  value,
  enabled,
  theme,
  styles,
}: {
  value?: string;
  enabled?: boolean;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  if (enabled !== undefined) {
    return (
      <View style={styles.comparisonCell}>
        <Ionicons
          name={enabled ? "checkmark-circle" : "close-circle-outline"}
          size={18}
          color={enabled ? theme.primary : theme.textMuted}
        />
      </View>
    );
  }

  return (
    <Text style={styles.comparisonValue} numberOfLines={2}>
      {value}
    </Text>
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
    planCard: {
      padding: 14,
      gap: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    planCardSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    planCardCurrent: {
      borderColor: theme.successColor,
    },
    plansSection: { gap: spacing.sm },
    planSelector: {
      gap: spacing.xs,
      paddingHorizontal: 2,
      paddingVertical: 2,
    },
    planTab: {
      minWidth: 100,
      minHeight: 50,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.md,
      backgroundColor: theme.surfaceElevated,
    },
    planTabSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    planTabText: { ...typography.label, color: theme.textSecondary },
    planTabTextSelected: { color: "#fff", fontWeight: "800" },
    planTabCaption: { ...typography.caption, color: theme.textMuted },
    planTabCaptionSelected: { color: "#fff" },
    plansLink: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
    },
    plansLinkText: {
      ...typography.label,
      color: theme.primary,
      fontWeight: "800",
    },
    planTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    planTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    planIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.surface,
    },
    planCopy: { minWidth: 0, flex: 1, gap: 2 },
    planTitle: { ...typography.headingSmall, color: theme.text },
    planSubtitle: { ...typography.caption, color: theme.textSecondary },
    recommendedLabel: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    planPrice: { ...typography.label, color: theme.primary, fontWeight: "800" },
    comparisonCard: {
      gap: 0,
      borderRadius: radius.md,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: "hidden",
    },
    comparisonTitle: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 8,
      ...typography.label,
      color: theme.text,
      fontWeight: "800",
    },
    comparisonHeader: {
      minHeight: 34,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      backgroundColor: theme.inputBackground,
    },
    comparisonFeatureHeader: { flex: 1 },
    comparisonColumn: {
      width: 78,
      textAlign: "center",
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "800",
    },
    comparisonRow: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    comparisonLabel: {
      flex: 1,
      paddingVertical: 8,
      ...typography.caption,
      color: theme.text,
    },
    comparisonCell: {
      width: 78,
      alignItems: "center",
      justifyContent: "center",
    },
    comparisonValue: {
      width: 78,
      textAlign: "center",
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    currentPlanNotice: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    currentPlanNoticeText: {
      ...typography.label,
      color: theme.successColor,
      fontWeight: "800",
    },
    planAction: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: theme.primary,
    },
    planActionText: {
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
