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
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
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
import { isMonthlyPlan } from "../utils/planPeriod";
import { getPlanTaglineKey } from "../utils/planTagline";
import {
  getSubscriptionUpgradeOptions,
  isPaidPlanCode,
  normalizePlanCode,
  type PaidPlanCode,
  type SubscriptionUpgradeReason,
} from "../utils/upgradeOptions";
import { DiscountedPriceLine } from "./PriceDiscount";
import { SmsPackageRow } from "./SmsPackageRow";
import { useSheetFrameStyle } from "../../../hooks/useSheetFrameStyle";
import { useDismissOnAppLock } from "../../pin-auth/hooks/useDismissOnAppLock";
import {
  useBottomSheet,
  useBottomSheetBackHandler,
} from "../../../bottom-sheet";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface SubscriptionUpgradeModalProps {
  visible: boolean;
  reason: SubscriptionUpgradeReason;
  subscription?: CurrentSubscription;
  onClose: () => void;
}

function priceLabel(price: number, locale: "uz" | "ru", freeLabel: string) {
  return price === 0 ? freeLabel : formatLocalizedCurrency(price, locale);
}

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

// The same capabilities, in the same order and wording, as the chips on the
// plans screen. Three rows hold for every plan (clients, reports, 24/7 help);
// they are here so the table reads as the whole of what a plan gives.
function planComparisonRows(
  freePlan: SubscriptionPlan,
  selectedPlan: SubscriptionPlan,
  t: Translate,
): PlanComparisonRow[] {
  return [
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
      label: t("subscription.featureClients"),
      freeValue: t("subscription.unlimited"),
      selectedValue: t("subscription.unlimited"),
    },
    {
      label: t("subscription.featureSmsLimit"),
      freeValue: t("subscription.noSms"),
      selectedValue: planLimitValue(selectedPlan.monthlySmsLimit, t, "sms"),
    },
    {
      label: t("subscription.featureReports"),
      freeEnabled: true,
      selectedEnabled: true,
    },
    {
      label: t("subscription.featureBlacklist"),
      freeEnabled: freePlan.blacklistEnabled,
      selectedEnabled: selectedPlan.blacklistEnabled,
    },
    {
      label: t("subscription.featureTelegram"),
      freeEnabled: true,
      selectedEnabled: true,
    },
    {
      label: t("subscription.featureTelegramMessage"),
      freeEnabled: true,
      selectedEnabled: true,
    },
    {
      label: t("subscription.featureTransactionSms"),
      freeEnabled: false,
      selectedEnabled: normalizePlanCode(selectedPlan.code) === "PREMIUM",
    },
    {
      label: t("subscription.featureBlacklistAutoSms"),
      freeEnabled: freePlan.transactionSmsEnabled,
      selectedEnabled: selectedPlan.transactionSmsEnabled,
    },
    {
      // Every plan comes with 24/7 help, the free one included.
      label: t("subscription.featurePrioritySupport"),
      freeEnabled: true,
      selectedEnabled: true,
    },
  ];
}

export function SubscriptionUpgradeModal({
  visible,
  reason,
  subscription,
  onClose,
}: SubscriptionUpgradeModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const contentBottomInset = Math.max(insets.bottom, spacing.md) + 10;
  const sheet = useRef<BottomSheetModal>(null);
  const sheetFrame = useSheetFrameStyle();
  const presentedRef = useRef(false);
  // Must not stay open on top of the PIN screen. Only while it is open:
  // dismissing a sheet that is not presented leaves the sheet library unable
  // to draw it the next time (see useDismissSheetOnAppLock).
  useDismissOnAppLock(() => {
    if (presentedRef.current) sheet.current?.dismiss();
  });
  const visibleRef = useRef(visible);
  const afterDismissRef = useRef<(() => void) | undefined>(undefined);
  visibleRef.current = visible;
  const { openSheet } = useBottomSheet();
  const plansQuery = useSubscriptionPlans();
  const packagesQuery = useSmsPackages();
  const [showPackageCatalog, setShowPackageCatalog] = useState(false);
  const options = getSubscriptionUpgradeOptions(subscription, reason);
  // With no plans to offer, the package list is the whole sheet: it opens on
  // the list, and there is no step to go back to.
  const packagesOnly = options.showPackages && !options.showPlans;
  const showingPackageCatalog =
    options.showPackages && (showPackageCatalog || packagesOnly);
  const paidPlanCatalog = useMemo(() => {
    const order: Record<PaidPlanCode, number> = {
      STANDARD: 1,
      PREMIUM: 2,
    };
    return [...(plansQuery.data ?? [])]
      .filter((item) => isPaidPlanCode(item.code) && (reason !== "auto-reminder" || normalizePlanCode(item.code) === "PREMIUM"))
      .sort((left, right) => {
        const leftCode = normalizePlanCode(left.code) as PaidPlanCode;
        const rightCode = normalizePlanCode(right.code) as PaidPlanCode;
        return order[leftCode] - order[rightCode];
      });
  }, [plansQuery.data, reason]);
  const [selectedPlanCode, setSelectedPlanCode] =
    useState<PaidPlanCode>("PREMIUM");
  const freePlan = useMemo(
    () =>
      (plansQuery.data ?? []).find(
        (item) => normalizePlanCode(item.code) === "FREE",
      ) ?? null,
    [plansQuery.data],
  );
  const selectedPlan = useMemo(
    () =>
      paidPlanCatalog.find(
        (item) => normalizePlanCode(item.code) === selectedPlanCode,
      ) ?? null,
    [paidPlanCatalog, selectedPlanCode],
  );
  const packages = packagesQuery.data ?? [];

  const closeSheet = useCallback(
    (afterDismiss?: () => void) => {
      if (!presentedRef.current) {
        onClose();
        afterDismiss?.();
        return;
      }
      afterDismissRef.current = afterDismiss;
      sheet.current?.dismiss();
    },
    [onClose],
  );

  const handleDismiss = useCallback(() => {
    presentedRef.current = false;
    const afterDismiss = afterDismissRef.current;
    afterDismissRef.current = undefined;
    onClose();
    afterDismiss?.();
  }, [onClose]);

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
    setShowPackageCatalog(false);
  }, [reason, visible]);

  useEffect(() => {
    if (!visible || !paidPlanCatalog.length) return;
    const preferred = paidPlanCatalog.some(
      (item) => normalizePlanCode(item.code) === "PREMIUM",
    )
      ? "PREMIUM"
      : "STANDARD";
    setSelectedPlanCode(preferred);
  }, [paidPlanCatalog, visible]);

  const openPlanPayment = useCallback(
    (plan: SubscriptionPlan) => {
      closeSheet(() =>
        openSheet("paymentCheckout", {
          productType: "subscription",
          plan,
        }),
      );
    },
    [closeSheet, openSheet],
  );

  const openPackagePayment = useCallback(
    (item: SmsPackage) => {
      closeSheet(() =>
        openSheet("paymentCheckout", {
          productType: "sms_package",
          package: item,
        }),
      );
    },
    [closeSheet, openSheet],
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
      // A centred column on a tablet, like the screen behind it.
      style={sheetFrame}
      index={0}
      enableDynamicSizing={false}
      snapPoints={["100%"]}
      topInset={insets.top}
      // bottomInset={contentBottomInset}
      enablePanDownToClose
      enableOverDrag={false}
      backdropComponent={renderBackdrop}
      onDismiss={handleDismiss}
      stackBehavior="replace"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.body]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ paddingBottom: contentBottomInset }}>
          <View style={styles.header}>
            {showingPackageCatalog && !packagesOnly ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                onPress={() => setShowPackageCatalog(false)}
                style={styles.backButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>
            ) : null}
            <Text style={styles.title}>
              {showingPackageCatalog
                ? t("subscription.packageSelect")
                : t("subscription.choosePlan")}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("subscription.close")}
              onPress={() => closeSheet()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={21} color={theme.textSecondary} />
            </Pressable>
          </View>
          {options.showPlans && !showingPackageCatalog ? (
            paidPlanCatalog.length && freePlan && selectedPlan ? (
              <View style={styles.plansSection}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.planSelector}
                >
                  {paidPlanCatalog.map((item) => {
                    const code = normalizePlanCode(item.code) as PaidPlanCode;
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
                  price={
                    selectedPlan.price > 0 &&
                    isMonthlyPlan(selectedPlan.durationDays)
                      ? `${formatLocalizedCurrency(selectedPlan.price, locale)} ${t("subscription.pricePerMonth")}`
                      : priceLabel(
                          selectedPlan.price,
                          locale,
                          t("subscription.freePrice"),
                        )
                  }
                  rows={planComparisonRows(freePlan, selectedPlan, t)}
                  planName={localizedPlanName(selectedPlan, t)}
                  recommended={
                    normalizePlanCode(selectedPlan.code) ===
                    options.recommendedPlanCode
                  }
                  actionLabel={t("subscription.purchasePlan")}
                  onPress={() => openPlanPayment(selectedPlan)}
                  loading={false}
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

          {options.showPackages ? (
            showingPackageCatalog ? (
              <View style={styles.packagesSection}>
                {packagesQuery.isPending ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={styles.loadingText}>
                      {t("subscription.quotaLoading")}
                    </Text>
                  </View>
                ) : packages.length ? (
                  <View style={styles.packageList}>
                    {packages.map((item) => (
                      <SmsPackageRow
                        key={item.id}
                        item={item}
                        onPress={openPackagePayment}
                      />
                    ))}
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
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={theme.primary}
                />
              </Pressable>
            )
          ) : null}
          {showingPackageCatalog ? (
            <Text style={styles.note}>{t("subscription.packageNote")}</Text>
          ) : null}
          {/* <View style={{ padding: contentBottomInset }}></View> */}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

function PlanComparisonCard({
  selectedPlan,
  rows,
  planName,
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
  const taglineKey = getPlanTaglineKey(selectedPlan.code);

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
          {taglineKey ? (
            <Text style={styles.planTagline}>{t(taglineKey)}</Text>
          ) : null}
        </View>
      </View>
      <DiscountedPriceLine
        product={selectedPlan}
        priceLabel={price}
        priceStyle={styles.planPrice}
      />
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
      alignItems: "center",
      gap: spacing.sm,
      justifyContent: "space-between",
    },
    backButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    closeButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    title: {
      flex: 1,
      ...typography.headingLarge,
      color: theme.text,
    },
    body: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: 2,
      paddingBottom: spacing.md,
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
      paddingVertical: 0,
    },
    planTab: {
      minWidth: 88,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 5,
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
    planTagline: { ...typography.caption, color: theme.textSecondary },
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
    packagesSection: { gap: spacing.sm,paddingTop: spacing.md },
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
    packageList: { gap: 10 },
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
    note: {
      marginTop: spacing.md,
      textAlign: "center",
      ...typography.caption,
      color: theme.textMuted,
    },
    pressed: { opacity: 0.72 },
    disabled: { opacity: 0.56 },
  });
