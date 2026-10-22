import React, { useCallback, useMemo } from "react";
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
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBottomSheet } from "../bottom-sheet";
import { useTheme } from "../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  useTranslation,
} from "../i18n";
import { AdminContactButton } from "../modules/support/components/AdminContactButton";
import {
  useCurrentSubscription,
  useSmsPackages,
  useSubscriptionPlans,
} from "../modules/subscription/hooks/useSubscription";
import { isMonthlyPlan } from "../modules/subscription/utils/planPeriod";
import { getSubscriptionPeriod } from "../modules/subscription/utils/subscriptionPeriod";
import { getPlanPurchaseAvailability } from "../modules/subscription/utils/planPurchase";
import { DiscountSummary } from "../modules/subscription/components/PriceDiscount";
import { SmsPackageRow } from "../modules/subscription/components/SmsPackageRow";
import type { SmsPackage } from "../modules/subscription/types";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type PlanIconName = React.ComponentProps<typeof Ionicons>["name"];

/** One capability of a plan, as a chip on its card. */
/** Only server-listed features are rendered. Unknown icons use a neutral fallback. */
function serverIcon(raw: string | null): PlanIconName {
  if (raw && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, raw)) {
    return raw as PlanIconName;
  }
  return "checkmark-circle-outline";
}

export function SubscriptionScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { locale, t } = useTranslation();
  const copy = SCREEN_COPY[locale === "ru" ? "ru" : "uz"];
  const { openSheet } = useBottomSheet();

  const currentQuery = useCurrentSubscription();
  const plansQuery = useSubscriptionPlans();
  const packagesQuery = useSmsPackages();

  const current = currentQuery.data;
  // When the current plan began and ends. Shown on its own card; a plan with
  // no end (the free one) shows neither.
  const currentPeriod = useMemo(() => getSubscriptionPeriod(current), [current]);
  const periodRange =
    currentPeriod.endAt
      ? [
          currentPeriod.startAt
            ? formatLocalizedDate(currentPeriod.startAt, locale)
            : null,
          formatLocalizedDate(currentPeriod.endAt, locale),
        ]
          .filter(Boolean)
          .join(" — ")
      : null;
  const periodLeft =
    currentPeriod.daysLeft === null
      ? null
      : currentPeriod.ended
        ? t("subscription.periodEnded")
        : currentPeriod.daysLeft === 0
          ? t("subscription.endsToday")
          : t("subscription.daysLeft", { count: currentPeriod.daysLeft });
  const plans = plansQuery.data ?? [];
  const packages = packagesQuery.data ?? [];
  const isLoading = plansQuery.isPending && !plans.length;

  const openPlanPayment = (plan: (typeof plans)[number]) => {
    openSheet("paymentCheckout", {
      productType: "subscription",
      plan,
    });
  };

  const openPackagePayment = useCallback(
    (item: SmsPackage) => {
      openSheet("paymentCheckout", {
        productType: "sms_package",
        package: item,
      });
    },
    [openSheet],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("subscription.screenTitle")}</Text>
        </View>

        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {t("subscription.availablePlans")}
          </Text>
          <Text style={styles.sectionMeta}>{copy.oneMonth}</Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.muted}>{t("subscription.loadingPlans")}</Text>
          </View>
        ) : plans.length ? (
          <View style={styles.planList}>
            {plans.map((plan) => {
              const normalizedCode = plan.code.toUpperCase();
              const isCurrent =
                normalizedCode === current?.planCode.toUpperCase();
              const isPremium = normalizedCode === "PREMIUM";
              const isFree = normalizedCode === "FREE";
              const availability = getPlanPurchaseAvailability(current, plan);
              const selectable = !isFree && !isCurrent && availability.allowed;
              const accent = getPlanAccent(plan.code, theme);

              const visibleFeatures = plan.presentation.features;
              const displayIcon = serverIcon(plan.presentation.icon);
              const displayBadge = plan.presentation.badge;

              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={plan.name}
                  accessibilityHint={
                    !isCurrent && !availability.allowed
                      ? t("subscription.downgradeBlocked")
                      : undefined
                  }
                  accessibilityState={{
                    selected: isCurrent,
                    disabled: !selectable,
                  }}
                  disabled={!selectable}
                  onPress={() => openPlanPayment(plan)}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      borderColor: isCurrent
                        ? theme.primary
                        : theme.tabBarBorder,
                      backgroundColor: isCurrent
                        ? `${theme.primary}05`
                        : isPremium
                          ? `${theme.warningColor}05`
                          : theme.surface,
                    },
                    pressed && selectable && styles.pressed,
                  ]}
                >
                  <View style={styles.planTopRow}>
                    <View
                      style={[
                        styles.planIcon,
                        { backgroundColor: accent.soft },
                      ]}
                    >
                      <Ionicons
                        name={displayIcon}
                        size={24}
                        color={accent.color}
                      />
                    </View>

                    <View style={styles.planMain}>
                      <View style={styles.planNameRow}>
                        <Text style={styles.planName}>
                          {plan.name}
                        </Text>
                        {isCurrent ? (
                          <View style={styles.currentPill}>
                            <Text style={styles.currentPillText}>{copy.currentBadge}</Text>
                          </View>
                        ) : displayBadge ? (
                          <View style={[styles.recommendedPill, { backgroundColor: theme.primaryLight }]}>
                            <Text style={[styles.recommendedText, { color: theme.primary }]}>{displayBadge}</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.planDescription} numberOfLines={2}>
                        {plan.description}
                      </Text>
                    </View>
                    <View>
                      {!isFree ? (
                        <View style={styles.priceWrap}>
                          <DiscountSummary product={plan} />
                          <Text style={styles.priceAmount}>
                            {formatLocalizedCurrency(plan.price, locale)}
                            {/* Part of the same line of text, in small print:
                                it says what the price is for without taking a
                                line of its own. */}
                            {isMonthlyPlan(plan.durationDays) ? (
                              <Text style={styles.pricePeriod}>
                                {" "}
                                {t("subscription.pricePerMonth")}
                              </Text>
                            ) : null}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {/* {!isCurrent && !isFree ? (
                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={theme.textMuted}
                      />
                    ) : null} */}
                  </View>

                  <View style={styles.featureChips}>
                    {visibleFeatures.map((feature, index) => (
                      <FeatureChip
                        key={`${feature.text}-${index}`}
                        icon={serverIcon(feature.icon)}
                        text={feature.text}
                        theme={theme}
                        styles={styles}
                      />
                    ))}
                    {/* {isFree ? (
                      <View style={styles.moreChip}>
                        <Text style={styles.moreChipText}>{copy.more}</Text>
                      </View>
                    ) : null} */}
                  </View>

                  {/* Renewing is not built yet: shown as a demo, switched
                      off, so nobody believes they have paid for more time. */}
                  {isCurrent && periodRange ? (
                    <View style={styles.renewBlock}>
                      <View
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={t("subscription.renewPlan")}
                        accessibilityHint={t("subscription.renewComingSoon")}
                        accessibilityState={{ disabled: true }}
                        style={styles.renewButton}
                      >
                        <Ionicons
                          name="refresh-outline"
                          size={17}
                          color={theme.textMuted}
                        />
                        <Text style={styles.renewText}>
                          {t("subscription.renewPlan")}
                        </Text>
                        <View style={styles.demoPill}>
                          <Text style={styles.demoPillText}>
                            {t("subscription.demoBadge")}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.renewNote}>
                        {t("subscription.renewComingSoon")}
                      </Text>
                    </View>
                  ) : null}

                  {/* The card's last line: how long this plan has left. A
                      status, not a feature, so it sits apart from the chips. */}
                  {isCurrent && periodRange ? (
                    <View style={styles.periodFooter}>
                      <View style={styles.periodDates}>
                        <Ionicons
                          name="calendar-outline"
                          size={15}
                          color={theme.textMuted}
                        />
                        <Text style={styles.periodText} numberOfLines={1}>
                          {periodRange}
                        </Text>
                      </View>
                      {periodLeft ? (
                        <View
                          style={[
                            styles.daysPill,
                            currentPeriod.endingSoon && styles.daysPillWarning,
                          ]}
                        >
                          <Text
                            style={[
                              styles.daysPillText,
                              currentPeriod.endingSoon &&
                                styles.daysPillTextWarning,
                            ]}
                            numberOfLines={1}
                          >
                            {periodLeft}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.loadingCard}>
            <Text style={styles.muted}>{t("subscription.plansNotFound")}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t("subscription.packages")}</Text>
          <Text style={styles.sectionMeta}>{copy.smsSubtitle}</Text>
        </View>

        {packagesQuery.isPending && !packages.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.muted}>{t("subscription.quotaLoading")}</Text>
          </View>
        ) : packages.length ? (
          <View style={styles.packageGrid}>
            {packages.map((item) => (
              <SmsPackageRow
                key={item.id}
                item={item}
                onPress={openPackagePayment}
              />
            ))}
          </View>
        ) : (
          <View style={styles.loadingCard}>
            <Text style={styles.muted}>
              {t("subscription.packageNotFound")}
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color={theme.primary}
          />
          <Text style={styles.infoText}>{copy.info}</Text>
        </View>

        <AdminContactButton variant="card" />
      </ScrollView>
    </SafeAreaView>
  );
}

// Only capabilities a plan includes reach a card, so a chip is always a
// positive statement. Restore the muted variant here if a card ever needs to
// show what a plan leaves out again.
function FeatureChip({
  icon,
  iconColor,
  text,
  theme,
  styles,
}: {
  icon: PlanIconName;
  /** Only where the icon stands for a brand; otherwise it follows the text. */
  iconColor?: string;
  text: string;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View
      style={[
        styles.featureChip,
        { backgroundColor: `${theme.successColor}0B` },
      ]}
    >
      {/* The icon says what the capability is. Every chip on a card is
          something the plan includes, so a tick in front of each one only
          repeated itself. */}
      <Ionicons
        name={icon}
        size={15}
        color={iconColor ?? theme.textSecondary}
      />
      <Text style={styles.featureChipText} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      minHeight: 76,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
      paddingBottom: 8,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCopy: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    title: {
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
      gap: 14,
    },
    sectionHeader: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    sectionTitle: {
      ...typography.headingSmall,
      color: theme.text,
      fontWeight: "800",
    },
    sectionMeta: {
      ...typography.bodySmall,
      color: theme.textMuted,
    },
    planList: {
      gap: 10,
    },
    planCard: {
      padding: 12,
      gap: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      backgroundColor: theme.surface,
    },
    planTopRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    planIcon: {
      width: 44,
      height: 44,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
    },
    planMain: {
      minWidth: 0,
      flex: 1,
      gap: 3,
    },
    planNameRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 7,
    },
    planName: {
      ...typography.headingSmall,
      color: theme.text,
      fontWeight: "800",
    },
    planDescription: {
      ...typography.caption,
      color: theme.textSecondary,
      lineHeight: 17,
    },
    periodFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    periodDates: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    periodText: {
      flexShrink: 1,
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "600",
    },
    daysPill: {
      flexShrink: 0,
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    daysPillWarning: { backgroundColor: `${theme.warningColor}18` },
    daysPillText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    daysPillTextWarning: { color: theme.warningColor },
    renewBlock: { gap: 4 },
    renewButton: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
    },
    renewText: {
      ...typography.labelSmall,
      color: theme.textMuted,
      fontWeight: "800",
    },
    demoPill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.full,
      backgroundColor: `${theme.warningColor}18`,
    },
    demoPillText: {
      fontSize: 10,
      lineHeight: 13,
      color: theme.warningColor,
      fontWeight: "800",
    },
    renewNote: {
      ...typography.caption,
      color: theme.textMuted,
      textAlign: "center",
    },
    currentPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    currentPillText: {
      fontSize: 10,
      lineHeight: 13,
      color: theme.primary,
      fontWeight: "800",
    },
    recommendedPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    recommendedText: {
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "800",
    },
    priceWrap: {
      flexShrink: 0,
      alignItems: "flex-end",
      gap: 1,
    },
    priceAmount: {
      ...typography.headingSmall,
      color: theme.text,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    pricePeriod: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "600",
    },
    featureChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },
    featureChip: {
      maxWidth: "100%",
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    featureChipText: {
      // Shrinks before the icon does when a long name meets a narrow card.
      flexShrink: 1,
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "600",
    },
    moreChip: {
      minHeight: 28,
      justifyContent: "center",
      paddingHorizontal: 10,
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    moreChipText: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
    },
    // One package per row: with a discount there is an old price, a price and
    // a badge to show, which half a row could not hold.
    packageGrid: { gap: 10 },
    infoBox: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      padding: 12,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.tabBarBorder,
    },
    infoText: {
      flex: 1,
      ...typography.bodySmall,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    loadingCard: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.tabBarBorder,
    },
    muted: {
      ...typography.bodySmall,
      color: theme.textMuted,
    },
    pressed: {
      opacity: 0.72,
    },
  });
