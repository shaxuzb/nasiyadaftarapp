import React, { useMemo } from "react";
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
import { getPlanPurchaseAvailability } from "../modules/subscription/utils/planPurchase";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type PlanIconName = React.ComponentProps<typeof Ionicons>["name"];

const SCREEN_COPY = {
  uz: {
    subtitle: "Ehtiyojingizga mos tarifni tanlang",
    oneMonth: "1 oylik tariflar",
    currentBadge: "Joriy tarif",
    dayUnit: "kun",
    bestChoice: "Eng yaxshi tanlov",
    renewsIn: (days: number) => `Tarifingiz ${days} kundan so‘ng yangilanadi`,
    renewsToday: "Tarifingiz bugun yangilanadi",
    activeNow: "Tarif hozir faol",
    freeDescription: "Asosiy imkoniyatlar bilan tanishing",
    standardDescription: "Kengaytirilgan imkoniyatlar bilan",
    premiumDescription: "To‘liq imkoniyatlar, maksimal qulaylik",
    unlimitedOrganizations: "Cheksiz tashkilot",
    autoSms: "Avto SMS",
    support247: "24/7 qo‘llab-quvvatlash",
    noBlacklist: "Qora ro‘yxat",
    telegram: "Telegram bot",
    more: "+2",
    smsSubtitle: "Qo‘shimcha SMS oling",
    info: "Tarif yoki SMS paketni tanlang. To‘lov xavfsiz tashqi sahifada davom etadi.",
  },
  ru: {
    subtitle: "Выберите тариф под свои задачи",
    oneMonth: "Тарифы на 1 месяц",
    currentBadge: "Текущий тариф",
    dayUnit: "дн.",
    bestChoice: "Лучший выбор",
    renewsIn: (days: number) => `Тариф обновится через ${days} дн.`,
    renewsToday: "Тариф обновится сегодня",
    activeNow: "Тариф активен",
    freeDescription: "Познакомьтесь с основными возможностями",
    standardDescription: "Расширенные возможности для работы",
    premiumDescription: "Все возможности и максимальный комфорт",
    unlimitedOrganizations: "Безлимит организаций",
    autoSms: "Авто SMS",
    support247: "Поддержка 24/7",
    noBlacklist: "Чёрный список",
    telegram: "Telegram-бот",
    more: "+2",
    smsSubtitle: "Дополнительные SMS",
    info: "Выберите тариф или пакет SMS. Оплата продолжится на защищённой внешней странице.",
  },
} as const;

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const end = new Date(date).getTime();
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

function getPlanIcon(code: string): PlanIconName {
  const normalized = code.trim().toUpperCase();
  if (normalized === "STANDARD") return "sparkles";
  if (normalized === "PREMIUM") return "diamond-outline";
  return "cube-outline";
}

function getPlanAccent(code: string, theme: AppTheme) {
  const normalized = code.trim().toUpperCase();
  if (normalized === "PREMIUM") {
    return {
      color: theme.warningColor,
      soft: `${theme.warningColor}14`,
    };
  }
  if (normalized === "STANDARD") {
    return {
      color: theme.primary,
      soft: theme.primaryLight,
    };
  }
  return {
    color: theme.textSecondary,
    soft: theme.inputBackground,
  };
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
  const plans = plansQuery.data ?? [];
  const packages = packagesQuery.data ?? [];
  const isLoading = plansQuery.isPending && !plans.length;

  const getPlanName = (code: string, fallback: string) => {
    const normalized = code.toUpperCase();
    if (normalized === "FREE") return t("subscription.freePlan");
    if (normalized === "STANDARD") return t("subscription.standardPlan");
    if (normalized === "PREMIUM") return t("subscription.premiumPlan");
    return fallback;
  };

  const getPlanDescription = (code: string, fallback: string) => {
    const normalized = code.toUpperCase();
    if (normalized === "FREE") return copy.freeDescription;
    if (normalized === "STANDARD") return copy.standardDescription;
    if (normalized === "PREMIUM") return copy.premiumDescription;
    return fallback;
  };

  const openPlanPayment = (plan: (typeof plans)[number]) => {
    openSheet("paymentCheckout", {
      productType: "subscription",
      plan,
    });
  };

  const currentStatusText = (() => {
    if (!current) return null;
    if (current.cancellationRequestedAt && current.endAt) {
      return t("subscription.planActiveUntil", {
        date: formatLocalizedDate(current.endAt, locale),
      });
    }

    const days = daysUntil(current.endAt);
    if (days === null) return copy.activeNow;
    return days === 0 ? copy.renewsToday : copy.renewsIn(days);
  })();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
        {current ? (
          <View style={styles.currentCard}>
            <View style={styles.currentTop}>
              <View style={styles.currentIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={28}
                  color={theme.primary}
                />
              </View>

              <View style={styles.flexCopy}>
                <Text style={styles.currentEyebrow}>
                  {copy.currentBadge.toUpperCase()}
                </Text>
                <Text style={styles.currentName}>
                  {getPlanName(current.planCode, current.planName)}
                </Text>
                <Text style={styles.currentDescription} numberOfLines={2}>
                  {getPlanDescription(current.planCode, current.planName)}
                </Text>
              </View>

              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>
                  {t("subscription.active")}
                </Text>
              </View>
            </View>

            <View style={styles.currentStats}>
              <View style={styles.currentStat}>
                <View style={styles.currentStatIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={19}
                    color={theme.primary}
                  />
                </View>
                <View>
                  <Text style={styles.currentStatValue}>
                    {current.sms.totalRemaining === null
                      ? "∞"
                      : current.sms.totalRemaining}
                  </Text>
                  <Text style={styles.currentStatLabel}>
                    {t("subscription.remainingSms")}
                  </Text>
                </View>
              </View>

              <View style={styles.currentStatDivider} />

              <View style={styles.currentStatCentered}>
                <Text style={styles.currentStatSymbol}>
                  {current.unlimitedOrganizations
                    ? "∞"
                    : (current.maxOrganizations ?? 0)}
                </Text>
                <Text style={styles.currentStatLabel}>
                  {t("subscription.organizations")}
                </Text>
              </View>

              <View style={styles.currentStatDivider} />

              <View style={styles.currentStatCentered}>
                <Ionicons
                  name={
                    current.blacklistEnabled
                      ? "shield-checkmark-outline"
                      : "shield-outline"
                  }
                  size={25}
                  color={
                    current.blacklistEnabled ? theme.primary : theme.textMuted
                  }
                />
                <Text style={styles.currentStatLabel}>
                  {t("subscription.blacklist")}
                </Text>
              </View>
            </View>

            {currentStatusText && current.cancellationRequestedAt ? (
              <Text style={styles.currentCancellation} numberOfLines={1}>
                {currentStatusText}
              </Text>
            ) : null}
          </View>
        ) : currentQuery.isPending ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.muted}>{t("subscription.loadingCurrent")}</Text>
          </View>
        ) : null}

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
              const selectable = !isCurrent && availability.allowed;
              const accent = getPlanAccent(plan.code, theme);
              const duration = plan.durationDays ?? 30;

              const features = [
                {
                  key: "organizations",
                  enabled: true,
                  text:
                    plan.maxOrganizations === null
                      ? copy.unlimitedOrganizations
                      : `${plan.maxOrganizations} ${t("subscription.organizations")}`,
                },
                {
                  key: "sms",
                  enabled: true,
                  text:
                    plan.monthlySmsLimit === null
                      ? `${t("subscription.unlimited")} SMS`
                      : t("subscription.smsPerMonth", {
                          count: plan.monthlySmsLimit,
                        }),
                },
                {
                  key: "blacklist",
                  enabled: plan.blacklistEnabled,
                  text: copy.noBlacklist,
                },
                {
                  key: "telegram",
                  enabled: plan.telegramBotEnabled,
                  text: copy.telegram,
                },
                {
                  key: "autoSms",
                  enabled: plan.transactionSmsEnabled,
                  text: copy.autoSms,
                },
                {
                  key: "support",
                  enabled: plan.prioritySupportEnabled,
                  text: copy.support247,
                },
              ];

              const visibleFeatures = isFree ? features.slice(0, 4) : features;

              return (
                <Pressable
                  key={plan.id}
                  accessibilityRole="button"
                  accessibilityLabel={getPlanName(plan.code, plan.name)}
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
                      borderColor: isCurrent ? theme.primary : theme.border,
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
                        name={getPlanIcon(plan.code)}
                        size={24}
                        color={accent.color}
                      />
                    </View>

                    <View style={styles.planMain}>
                      <View style={styles.planNameRow}>
                        <Text style={styles.planName}>
                          {getPlanName(plan.code, plan.name)}
                        </Text>

                        {isCurrent ? (
                          <View style={styles.currentPill}>
                            <Text style={styles.currentPillText}>
                              {copy.currentBadge}
                            </Text>
                          </View>
                        ) : isPremium ? (
                          <View
                            style={[
                              styles.recommendedPill,
                              {
                                backgroundColor: `${theme.warningColor}16`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.recommendedText,
                                { color: theme.warningColor },
                              ]}
                            >
                              {copy.bestChoice}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.planDescription} numberOfLines={2}>
                        {getPlanDescription(plan.code, plan.description)}
                      </Text>
                    </View>

                    <View style={styles.priceWrap}>
                      <Text style={styles.priceAmount}>
                        {formatLocalizedCurrency(plan.price, locale)}
                      </Text>
                      <Text style={styles.pricePeriod}>/ {duration} {copy.dayUnit}</Text>
                    </View>

                    <View
                      style={[
                        styles.radio,
                        isCurrent && {
                          borderColor: theme.primary,
                          borderWidth: 2,
                        },
                      ]}
                    >
                      {isCurrent ? (
                        <View style={styles.radioDot} />
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.featureChips}>
                    {visibleFeatures.map((feature) => (
                      <FeatureChip
                        key={feature.key}
                        enabled={feature.enabled}
                        text={feature.text}
                        theme={theme}
                        styles={styles}
                      />
                    ))}
                    {isFree ? (
                      <View style={styles.moreChip}>
                        <Text style={styles.moreChipText}>{copy.more}</Text>
                      </View>
                    ) : null}
                  </View>
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
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() =>
                  openSheet("paymentCheckout", {
                    productType: "sms_package",
                    package: item,
                  })
                }
                style={({ pressed }) => [
                  styles.packageCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.packageIcon}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={20}
                    color={theme.primary}
                  />
                </View>

                <View style={styles.packageCopy}>
                  <Text style={styles.packageName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.packagePrice} numberOfLines={1}>
                    {formatLocalizedCurrency(item.price, locale)}
                  </Text>
                  <Text style={styles.packageHint} numberOfLines={1}>
                    {t("subscription.packageHint")}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.textMuted}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.loadingCard}>
            <Text style={styles.muted}>{t("subscription.packageNotFound")}</Text>
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

function FeatureChip({
  text,
  enabled,
  theme,
  styles,
}: {
  text: string;
  enabled: boolean;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View
      style={[
        styles.featureChip,
        {
          backgroundColor: enabled
            ? `${theme.successColor}0B`
            : `${theme.textMuted}0A`,
        },
      ]}
    >
      <View
        style={[
          styles.featureStatus,
          {
            backgroundColor: enabled ? theme.successColor : theme.textMuted,
          },
        ]}
      >
        <Ionicons
          name={enabled ? "checkmark" : "close"}
          size={10}
          color={theme.surface}
        />
      </View>
      <Text
        style={[
          styles.featureChipText,
          !enabled && { color: theme.textMuted },
        ]}
        numberOfLines={1}
      >
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
    flexCopy: {
      minWidth: 0,
      flex: 1,
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
    currentCard: {
      padding: 14,
      gap: 14,
      borderRadius: radius.xl,
      backgroundColor: theme.primaryLight,
      borderWidth: 1,
      borderColor: `${theme.primary}28`,
    },
    currentTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    currentIcon: {
      width: 58,
      height: 58,
      flexShrink: 0,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
    },
    currentEyebrow: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    currentName: {
      ...typography.headingMedium,
      color: theme.text,
      marginTop: 1,
    },
    currentDescription: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      marginTop: 3,
      lineHeight: 19,
    },
    currentStats: {
      minHeight: 78,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: `${theme.primary}10`,
    },
    currentStat: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    currentStatCentered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    currentStatIcon: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    currentStatValue: {
      ...typography.headingMedium,
      color: theme.text,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    currentStatSymbol: {
      fontSize: 28,
      lineHeight: 30,
      color: theme.primary,
      fontWeight: "700",
    },
    currentStatLabel: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: "center",
    },
    currentStatDivider: {
      width: 1,
      height: 42,
      backgroundColor: `${theme.primary}20`,
    },
    currentCancellation: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    activeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radius.full,
      backgroundColor: theme.paymentBg,
    },
    activeBadgeText: {
      ...typography.caption,
      color: theme.paymentColor,
      fontWeight: "800",
    },
    activeDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.paymentColor,
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
    },
    radio: {
      width: 22,
      height: 22,
      flexShrink: 0,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: theme.textMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    radioDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      backgroundColor: theme.primary,
    },
    featureChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },
    featureChip: {
      maxWidth: "100%",
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: radius.full,
    },
    featureStatus: {
      width: 16,
      height: 16,
      flexShrink: 0,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    featureChipText: {
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
    packageGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 10,
    },
    packageCard: {
      width: "48.7%",
      minHeight: 104,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    packageIcon: {
      width: 44,
      height: 44,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    packageCopy: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    packageName: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: "800",
    },
    packagePrice: {
      ...typography.bodySmall,
      color: theme.primary,
      fontWeight: "800",
    },
    packageHint: {
      ...typography.caption,
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 13,
    },
    infoBox: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      padding: 12,
      borderRadius: radius.lg,
      backgroundColor: theme.inputBackground,
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
      borderColor: theme.border,
    },
    muted: {
      ...typography.bodySmall,
      color: theme.textMuted,
    },
    pressed: {
      opacity: 0.72,
    },
  });
