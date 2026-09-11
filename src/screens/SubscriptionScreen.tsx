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
import { useTheme } from "../hooks/useTheme";
import {
  useCurrentSubscription,
  useSmsPackages,
  useSubscriptionPlans,
} from "../modules/subscription/hooks/useSubscription";
import { AdminContactButton } from "../modules/support/components/AdminContactButton";
import { useAdminContact } from "../modules/support/hooks/useAdminContact";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { formatLocalizedCurrency, useTranslation } from "../i18n";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function limitLabel(
  value: number | null,
  unlimited: boolean,
  unit: string,
  unlimitedLabel: string,
) {
  return unlimited || value === null
    ? `${unlimitedLabel} ${unit}`
    : `${value} ${unit}`;
}

function priceLabel(
  price: number,
  durationDays: number | null,
  locale: "uz" | "ru",
  freeLabel: string,
  durationLabel: (params: { price: string; days: number }) => string,
) {
  if (price === 0) return freeLabel;
  const formattedPrice = formatLocalizedCurrency(price, locale);
  return durationDays
    ? durationLabel({ price: formattedPrice, days: durationDays })
    : formattedPrice;
}

export function SubscriptionScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { locale, t } = useTranslation();
  const currentQuery = useCurrentSubscription();
  const plansQuery = useSubscriptionPlans();
  const packagesQuery = useSmsPackages();
  const { isOpening, openAdminContact } = useAdminContact();
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
    if (normalized === "FREE") return t("subscription.freePlanDescription");
    if (normalized === "STANDARD") {
      return t("subscription.standardPlanDescription");
    }
    if (normalized === "PREMIUM") {
      return t("subscription.premiumPlanDescription");
    }
    return fallback;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <Text style={styles.title}>{t("subscription.screenTitle")}</Text>
        <View style={styles.backButton} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {current ? (
          <View style={styles.currentCard}>
            <View style={styles.currentTop}>
              <View style={styles.planIcon}>
                <Ionicons
                  name="sparkles-outline"
                  size={23}
                  color={theme.primary}
                />
              </View>
              <View style={styles.flexCopy}>
                <Text style={styles.eyebrow}>{t("subscription.currentPlan")}</Text>
                <Text style={styles.currentName}>
                  {getPlanName(current.planCode, current.planName)}
                </Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{t("subscription.active")}</Text>
              </View>
            </View>
            <View style={styles.quotaRow}>
              <View style={styles.quotaItem}>
                <Text style={styles.quotaValue}>
                  {current.sms.totalRemaining === null
                    ? "∞"
                    : current.sms.totalRemaining}
                </Text>
                <Text style={styles.quotaLabel}>{t("subscription.remainingSms")}</Text>
              </View>
              <View style={styles.quotaDivider} />
              <View style={styles.quotaItem}>
                <Text style={styles.quotaValue}>
                  {current.unlimitedOrganizations
                    ? "∞"
                    : current.maxOrganizations ?? 0}
                </Text>
                <Text style={styles.quotaLabel}>{t("subscription.organizations")}</Text>
              </View>
              <View style={styles.quotaDivider} />
              <View style={styles.quotaItem}>
                <Text style={styles.quotaValue}>
                  {current.blacklistEnabled ? "✓" : "—"}
                </Text>
                <Text style={styles.quotaLabel}>{t("subscription.blacklist")}</Text>
              </View>
            </View>
          </View>
        ) : currentQuery.isPending ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.muted}>{t("subscription.loadingCurrent")}</Text>
          </View>
        ) : null}

        <SectionTitle title={t("subscription.availablePlans")} theme={theme} />
        {isLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.muted}>{t("subscription.loadingPlans")}</Text>
          </View>
        ) : plans.length ? (
          plans.map((plan) => {
            const isCurrent =
              plan.code.toUpperCase() === current?.planCode.toUpperCase();
            return (
              <View
                key={plan.id}
                style={[styles.planCard, isCurrent && styles.planCardActive]}
              >
                <View style={styles.planHeader}>
                  <View style={styles.flexCopy}>
                    <Text style={styles.planName}>
                      {getPlanName(plan.code, plan.name)}
                    </Text>
                    <Text style={styles.planDescription}>
                      {getPlanDescription(plan.code, plan.description)}
                    </Text>
                  </View>
                  {isCurrent ? (
                    <Text style={styles.currentLabel}>{t("subscription.current")}</Text>
                  ) : null}
                </View>
                <Text style={styles.price}>
                  {priceLabel(
                    plan.price,
                    plan.durationDays,
                    locale,
                    t("subscription.freePrice"),
                    (params) => t("subscription.priceForDays", params),
                  )}
                </Text>
                <View style={styles.featureList}>
                  <FeatureRow
                    text={limitLabel(
                      plan.maxOrganizations,
                      plan.maxOrganizations === null,
                      t("subscription.organizations"),
                      t("subscription.unlimited"),
                    )}
                    theme={theme}
                    styles={styles}
                  />
                  <FeatureRow
                    text={
                      plan.monthlySmsLimit === null
                        ? `${t("subscription.unlimited")} SMS`
                        : t("subscription.smsPerMonth", { count: plan.monthlySmsLimit })
                    }
                    theme={theme}
                    styles={styles}
                  />
                  <FeatureRow
                    text={
                      plan.blacklistEnabled
                        ? t("subscription.blacklistAvailable")
                        : t("subscription.blacklistUnavailable")
                    }
                    enabled={plan.blacklistEnabled}
                    theme={theme}
                    styles={styles}
                  />
                  <FeatureRow
                    text={
                      plan.telegramBotEnabled
                        ? t("subscription.telegramAvailable")
                        : t("subscription.telegramUnavailable")
                    }
                    enabled={plan.telegramBotEnabled}
                    theme={theme}
                    styles={styles}
                  />
                  <FeatureRow
                    text={
                      plan.transactionSmsEnabled
                        ? t("subscription.transactionSmsAvailable")
                        : t("subscription.transactionSmsUnavailable")
                    }
                    enabled={plan.transactionSmsEnabled}
                    theme={theme}
                    styles={styles}
                  />
                  <FeatureRow
                    text={
                      plan.prioritySupportEnabled
                        ? t("subscription.prioritySupportAvailable")
                        : t("subscription.prioritySupportUnavailable")
                    }
                    enabled={plan.prioritySupportEnabled}
                    theme={theme}
                    styles={styles}
                  />
                </View>
                {!isCurrent ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${getPlanName(plan.code, plan.name)} ${t("subscription.adminActivate")}`}
                    accessibilityState={{
                      disabled: isOpening,
                      busy: isOpening,
                    }}
                    disabled={isOpening}
                    onPress={() => void openAdminContact()}
                    style={({ pressed }) => [
                      styles.planAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    {isOpening ? (
                      <ActivityIndicator size="small" color={theme.primary} />
                    ) : null}
                    <Text style={styles.planActionText}>
                      {t("subscription.adminActivate")}
                    </Text>
                    <Ionicons
                      name="arrow-forward"
                      size={16}
                      color={theme.primary}
                    />
                  </Pressable>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.loadingCard}>
            <Text style={styles.muted}>{t("subscription.plansNotFound")}</Text>
          </View>
        )}

        <SectionTitle title={t("subscription.packages")} theme={theme} />
        <View style={styles.packageGrid}>
          {packages.map((item) => (
            <View key={item.id} style={styles.packageCard}>
              <View style={styles.packageIcon}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={theme.primary}
                />
              </View>
              <Text style={styles.packageName}>{item.name}</Text>
              <Text style={styles.packagePrice}>
                {priceLabel(
                  item.price,
                  null,
                  locale,
                  t("subscription.freePrice"),
                  (params) => t("subscription.priceForDays", params),
                )}
              </Text>
              <Text style={styles.packageHint}>{t("subscription.packageHint")}</Text>
            </View>
          ))}
        </View>
        <View style={styles.infoBox}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={theme.primary}
          />
          <Text style={styles.infoText}>
            {t("subscription.info")}
          </Text>
        </View>
        <AdminContactButton variant="card" />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, theme }: { title: string; theme: AppTheme }) {
  return (
    <Text
      style={{
        ...typography.headingSmall,
        color: theme.text,
        marginTop: spacing.xs,
      }}
    >
      {title}
    </Text>
  );
}

function FeatureRow({
  text,
  enabled = true,
  theme,
  styles,
}: {
  text: string;
  enabled?: boolean;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={enabled ? "checkmark-circle" : "close-circle-outline"}
        size={17}
        color={enabled ? theme.successColor : theme.textMuted}
      />
      <Text
        style={[styles.featureText, !enabled && { color: theme.textMuted }]}
      >
        {text}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flexCopy: { minWidth: 0, flex: 1, gap: 2 },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    backButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      ...typography.headingLarge,
      color: theme.text,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    currentCard: {
      padding: 15,
      gap: 15,
      borderRadius: radius.xl,
      backgroundColor: theme.primaryLight,
      borderWidth: 1,
      borderColor: `${theme.primary}55`,
    },
    currentTop: { flexDirection: "row", alignItems: "center", gap: 11 },
    planIcon: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: theme.surface,
    },
    eyebrow: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
      letterSpacing: 0.7,
    },
    currentName: { ...typography.headingMedium, color: theme.text },
    activeBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radius.full,
      backgroundColor: theme.paymentBg,
    },
    activeBadgeText: {
      ...typography.caption,
      color: theme.paymentColor,
      fontWeight: "800",
    },
    quotaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: `${theme.primary}22`,
    },
    quotaItem: { alignItems: "center", gap: 2 },
    quotaValue: { ...typography.headingMedium, color: theme.text },
    quotaLabel: { ...typography.caption, color: theme.textSecondary },
    quotaDivider: {
      width: 1,
      height: 30,
      backgroundColor: `${theme.primary}22`,
    },
    planCard: {
      padding: 15,
      gap: 10,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    planCardActive: {
      borderColor: theme.primary,
      backgroundColor: theme.surfaceElevated,
    },
    planHeader: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
    planName: { ...typography.headingMedium, color: theme.text },
    planDescription: { ...typography.caption, color: theme.textSecondary },
    currentLabel: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    price: { ...typography.headingSmall, color: theme.primary },
    featureList: { gap: 7 },
    featureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    featureText: { ...typography.bodySmall, color: theme.textSecondary },
    planAction: {
      minHeight: 40,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginTop: 2,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    planActionText: {
      ...typography.labelSmall,
      color: theme.primary,
      fontWeight: "800",
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
    muted: { ...typography.bodySmall, color: theme.textMuted },
    packageGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    packageCard: {
      width: "48%",
      minHeight: 122,
      padding: 13,
      gap: 4,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    packageIcon: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: theme.primaryLight,
    },
    packageName: { ...typography.label, color: theme.text, fontWeight: "800" },
    packagePrice: {
      ...typography.bodySmall,
      color: theme.primary,
      fontWeight: "700",
    },
    packageHint: { ...typography.caption, color: theme.textMuted },
    infoBox: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    infoText: { flex: 1, ...typography.caption, color: theme.textSecondary },
    pressed: { opacity: 0.7 },
  });
