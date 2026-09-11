import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReports } from "../modules/reports/hooks/useReports";
import { ReportsResponse } from "../modules/reports/types";
import { AppTheme, RootStackParamList } from "../types";
import { useTheme } from "../hooks/useTheme";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../context/ToastContext";
import {
  getLocalizedApiErrorMessage,
  useTranslation,
  formatLocalizedCurrency,
  formatLocalizedDisplayedBalance,
} from "../i18n";
import { exportClientsReport } from "../modules/reports/services/reportsService";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface MetricCardProps {
  icon: IconName;
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
}

const EMPTY_REPORT: ReportsResponse = {
  totalDebt: 0,
  totalPayment: 0,
  remainingBalance: 0,
  totalClients: 0,
  activeDebtorsCount: 0,
  debtFreeClientsCount: 0,
  totalTransactions: 0,
  paymentEfficiencyPercent: 0,
  currentMonthDebt: 0,
  currentMonthPayment: 0,
  currentMonthBalance: 0,
  topDebtors: [],
  monthlyStatistics: [],
};

const MetricCard = React.memo(function MetricCard({
  icon,
  label,
  value,
  color,
  backgroundColor,
}: MetricCardProps) {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text
          selectable
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          style={[styles.metricValue, { color }]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
});

function getNameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function ReportsScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const { locale, t } = useTranslation();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);
  const {
    report,
    error: dataError,
    isLoading,
    isRefreshing,
    refetch,
  } = useReports();
  const data = report ?? EMPTY_REPORT;
  const { topDebtors } = data;

  const remainingBalance = data.remainingBalance;
  const hasDebt = remainingBalance > 0;
  const hasOverpayment = remainingBalance < 0;
  const heroAccentColor = hasDebt ? theme.debtColor : theme.paymentColor;
  const heroLabel = hasDebt
    ? t("reports.heroDebt")
    : hasOverpayment
      ? t("reports.heroOverpayment")
      : t("reports.heroNoDebt");
  const heroCaption = hasDebt
    ? t("reports.heroDebtCaption")
    : hasOverpayment
      ? t("reports.heroOverpaymentCaption")
      : t("reports.heroSettledCaption");
  const heroCardTone = hasDebt
    ? styles.heroDebtCard
    : styles.heroSuccessCard;
  const isInitialLoading = isLoading && !report;
  const handleRefresh = React.useCallback(async () => {
    const result = await refetch();
    if (result.error) {
      showToast(
        getLocalizedApiErrorMessage(result.error, "reports.loadErrorTitle", t),
        "error",
      );
    }
  }, [refetch, showToast, t]);

  const handleExport = React.useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    try {
      await exportClientsReport(t("reports.exportDialogTitle"));
      showToast(t("reports.exportReady"), "success");
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "reports.exportError", t),
        "error",
      );
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, showToast, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>{t("reports.screenTitle")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("reports.exportA11y")}
          accessibilityState={{ disabled: isExporting, busy: isExporting }}
          disabled={isExporting}
          onPress={() => {
            void handleExport();
          }}
          style={({ pressed }) => [
            styles.headerExportButton,
            pressed && styles.pressed,
            isExporting && styles.headerExportButtonDisabled,
          ]}
        >
          {isExporting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name="download-outline"
              size={18}
              color={theme.primary}
            />
          )}
          <Text style={styles.headerExportText}>{t("reports.export")}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void handleRefresh()}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {dataError && !report ? (
          <EmptyState
            iconName="cloud-offline-outline"
            title={t("reports.loadErrorTitle")}
            description={getLocalizedApiErrorMessage(
              dataError,
              "reports.loadErrorDescription",
              t,
            )}
            action={
              <PrimaryButton
                label={t("reports.retry")}
                onPress={() => void handleRefresh()}
              />
            }
          />
        ) : isInitialLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.loadingText}>{t("reports.loading")}</Text>
          </View>
        ) : (
          <>
            <View style={[styles.heroCard, heroCardTone]}>
              {/* <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.heroStatus}>
                  <View style={styles.liveDot} />
                  <Text style={styles.heroStatusText}>Joriy holat</Text>
                </View>
              </View> */}

              <Text style={[styles.heroLabel, { color: heroAccentColor }]}>
                {heroLabel}
              </Text>
              <Text
                selectable
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
                style={[styles.heroValue, { color: heroAccentColor }]}
              >
                {formatLocalizedDisplayedBalance(remainingBalance, locale)}
              </Text>
              <Text style={styles.heroCaption}>{heroCaption}</Text>

              {/* <View style={styles.heroDivider} />
              <View style={styles.heroSummary}>
                <View style={styles.heroSummaryItem}>
                  <Text selectable style={styles.heroSummaryValue}>
                    {data.activeDebtorsCount}
                  </Text>
                  <Text style={styles.heroSummaryLabel}>Faol qarzdor</Text>
                </View>
                <View style={styles.heroSummaryDivider} />
                <View style={styles.heroSummaryItem}>
                  <Text selectable style={styles.heroSummaryValue}>
                    {settledCustomers}
                  </Text>
                  <Text style={styles.heroSummaryLabel}>Qarzsiz mijoz</Text>
                </View>
              </View> */}
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricRow}>
                <MetricCard
                  icon="arrow-down"
                  label={t("reports.totalDebt")}
                  value={formatLocalizedCurrency(data.totalDebt, locale)}
                  color={theme.debtColor}
                  backgroundColor={theme.debtBg}
                />
                <MetricCard
                  icon="arrow-up"
                  label={t("reports.totalPayment")}
                  value={formatLocalizedCurrency(data.totalPayment, locale)}
                  color={theme.paymentColor}
                  backgroundColor={theme.paymentBg}
                />
              </View>
              {/* <View style={styles.metricRow}>
                <MetricCard
                  icon="people"
                  label="Barcha mijozlar"
                  value={String(data.totalClients)}
                  color={theme.primary}
                  backgroundColor={theme.primaryLight}
                />
                <MetricCard
                  icon="swap-horizontal"
                  label="Amaliyotlar"
                  value={String(data.totalTransactions)}
                  color={theme.secondary}
                  backgroundColor={theme.inputBackground}
                />
              </View> */}
            </View>

            {/* <View style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.sectionIconGreen}>
                  <Ionicons
                    name="analytics"
                    size={19}
                    color={theme.paymentColor}
                  />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>To'lov samaradorligi</Text>
                  <Text style={styles.cardSubtitle}>
                    Jami qarzning qaytarilgan qismi
                  </Text>
                </View>
                <Text selectable style={styles.paymentPercent}>
                  {paymentPercent}%
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${paymentPercent}%` as `${number}%` },
                  ]}
                />
              </View>

              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>0%</Text>
                <Text style={styles.progressLabel}>To'liq yopildi</Text>
              </View>

              <View style={styles.periodDivider} />
              <Text style={styles.periodTitle}>Shu oy</Text>
              <View style={styles.periodRow}>
                <View style={styles.periodItem}>
                  <View style={[styles.periodDot, styles.debtDot]} />
                  <View style={styles.periodContent}>
                    <Text style={styles.periodLabel}>Qarz berildi</Text>
                    <Text
                      selectable
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.periodValue, styles.debtText]}
                    >
                      {formatCurrency(currentMonth.debt)}
                    </Text>
                  </View>
                </View>
                <View style={styles.periodVerticalDivider} />
                <View style={styles.periodItem}>
                  <View style={[styles.periodDot, styles.paymentDot]} />
                  <View style={styles.periodContent}>
                    <Text style={styles.periodLabel}>To'lov olindi</Text>
                    <Text
                      selectable
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      style={[styles.periodValue, styles.paymentText]}
                    >
                      {formatCurrency(currentMonth.payment)}
                    </Text>
                  </View>
                </View>
              </View>
            </View> */}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{t("reports.topDebtors")}</Text>
                <Text style={styles.sectionSubtitle}>
                  {t("reports.topDebtorsSubtitle")}
                </Text>
              </View>
              <View style={styles.countBadge}>
                <Text selectable style={styles.countBadgeText}>
                  {topDebtors.length}
                </Text>
              </View>
            </View>

            <View style={styles.listCard}>
              {topDebtors.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconGreen}>
                    <Ionicons
                      name="checkmark-circle"
                      size={27}
                      color={theme.paymentColor}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>{t("reports.activeDebtorsEmpty")}</Text>
                  <Text style={styles.emptyDescription}>
                    {t("reports.allSettled")}
                  </Text>
                </View>
              ) : (
                topDebtors.map((entry, index) => (
                  <Pressable
                    key={entry.clientId}
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.fullName}, ${formatLocalizedCurrency(entry.balance, locale)} ${t("reports.debtCaption")}`}
                    onPress={() =>
                      navigation.navigate("CustomerDetail", {
                        customerId: entry.clientId,
                      })
                    }
                    style={({ pressed }) => [
                      styles.debtorRow,
                      index < topDebtors.length - 1 && styles.rowBorder,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getNameInitials(entry.fullName)}
                      </Text>
                    </View>
                    <View style={styles.debtorIdentity}>
                      <Text style={styles.debtorName} numberOfLines={1}>
                        {entry.fullName}
                      </Text>
                      <Text
                        selectable
                        style={styles.debtorPhone}
                        numberOfLines={1}
                      >
                        {entry.phoneNumber}
                      </Text>
                    </View>
                    <View style={styles.debtorAmountWrap}>
                      <Text
                        selectable
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.72}
                        style={styles.debtorAmount}
                      >
                        {formatLocalizedCurrency(entry.balance, locale)}
                      </Text>
                      <Text style={styles.debtorCaption}>{t("reports.debtCaption")}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={theme.textMuted}
                    />
                  </Pressable>
                ))
              )}
            </View>

            {/* <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Oylik pul oqimi</Text>
                <Text style={styles.sectionSubtitle}>
                  So'nggi 6 oy ko'rsatkichlari
                </Text>
              </View>
            </View> */}

            {/* <View style={styles.listCard}>
              {monthlyMap.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBlue}>
                    <Ionicons
                      name="bar-chart"
                      size={25}
                      color={theme.primary}
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Hali ma'lumot yo'q</Text>
                  <Text style={styles.emptyDescription}>
                    Qarz yoki to'lov kiritilganda statistika chiqadi
                  </Text>
                </View>
              ) : (
                monthlyMap.map(([month, data], index) => (
                  <View
                    key={month}
                    style={[
                      styles.monthRow,
                      index < monthlyMap.length - 1 && styles.rowBorder,
                    ]}
                  >
                    <Text style={styles.monthTitle}>{formatMonth(month)}</Text>

                    <View style={styles.flowRow}>
                      <View style={styles.flowLabelWrap}>
                        <View style={[styles.flowDot, styles.debtDot]} />
                        <Text style={styles.flowLabel}>Qarz</Text>
                      </View>
                      <View style={styles.flowTrack}>
                        <View
                          style={[
                            styles.flowFill,
                            styles.debtFill,
                            { width: getBarWidth(data.debt, monthlyMax) },
                          ]}
                        />
                      </View>
                      <Text
                        selectable
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[styles.flowValue, styles.debtText]}
                      >
                        {formatCurrency(data.debt)}
                      </Text>
                    </View>

                    <View style={styles.flowRow}>
                      <View style={styles.flowLabelWrap}>
                        <View style={[styles.flowDot, styles.paymentDot]} />
                        <Text style={styles.flowLabel}>To'lov</Text>
                      </View>
                      <View style={styles.flowTrack}>
                        <View
                          style={[
                            styles.flowFill,
                            styles.paymentFill,
                            { width: getBarWidth(data.payment, monthlyMax) },
                          ]}
                        />
                      </View>
                      <Text
                        selectable
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        style={[styles.flowValue, styles.paymentText]}
                      >
                        {formatCurrency(data.payment)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View> */}

            <View style={styles.footerSpace} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    headerCopy: { minWidth: 0, flex: 1, gap: 2 },
    screenTitle: {
      color: theme.text,
      fontSize: 28,
      lineHeight: 39,
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    screenSubtitle: {
      color: theme.textSecondary,
      fontSize: 15,
      lineHeight: 21,
    },
    headerExportButton: {
      minWidth: 76,
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 11,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      borderCurve: "continuous",
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    headerExportButtonDisabled: { opacity: 0.62 },
    headerExportText: {
      color: theme.primary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "800",
    },
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 28,
      gap: 14,
    },
    loadingWrap: {
      flex: 1,
      minHeight: 360,
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    heroCard: {
      overflow: "hidden",
      padding: 18,
      gap: 4,
      borderRadius: 22,
      borderCurve: "continuous",
      borderWidth: 1,
      boxShadow: theme.cardShadow,
    },
    heroDebtCard: {
      backgroundColor: theme.debtBg,
      borderColor: theme.debtColor,
    },
    heroSuccessCard: {
      backgroundColor: theme.paymentBg,
      borderColor: theme.paymentColor,
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 8,
    },
    heroIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    heroStatus: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.14)",
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: theme.paymentColor,
    },
    heroStatusText: {
      color: "#FFFFFF",
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
    },
    heroLabel: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    heroValue: {
      color: theme.text,
      fontSize: 31,
      lineHeight: 38,
      fontWeight: "800",
      letterSpacing: -0.8,
      fontVariant: ["tabular-nums"],
    },
    heroCaption: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
    },
    heroMessage: {
      color: "rgba(255,255,255,0.82)",
      fontSize: 12,
      lineHeight: 17,
    },
    heroDivider: {
      height: 1,
      marginTop: 12,
      marginBottom: 10,
      backgroundColor: "rgba(255,255,255,0.20)",
    },
    heroSummary: {
      flexDirection: "row",
      alignItems: "center",
    },
    heroSummaryItem: {
      flex: 1,
      gap: 1,
    },
    heroSummaryDivider: {
      width: 1,
      height: 34,
      marginHorizontal: 16,
      backgroundColor: "rgba(255,255,255,0.20)",
    },
    heroSummaryValue: {
      color: "#FFFFFF",
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    heroSummaryLabel: {
      color: "rgba(255,255,255,0.72)",
      fontSize: 11,
      lineHeight: 15,
    },
    metricGrid: {
      gap: 10,
    },
    metricRow: {
      flexDirection: "row",
      gap: 10,
    },
    metricCard: {
      minWidth: 0,
      minHeight: 60,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 11,
      paddingVertical: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 17,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    metricIcon: {
      width: 38,
      height: 38,
      borderRadius: 13,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
    },
    metricContent: {
      minWidth: 0,
      flex: 1,
      gap: 2,
    },
    metricLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "600",
    },
    metricValue: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    paymentCard: {
      padding: 16,
      gap: 10,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    sectionIconGreen: {
      width: 36,
      height: 36,
      borderRadius: 12,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.paymentBg,
    },
    cardHeaderText: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    cardTitle: {
      color: theme.text,
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
    },
    cardSubtitle: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 14,
    },
    paymentPercent: {
      color: theme.paymentColor,
      fontSize: 21,
      lineHeight: 26,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    progressTrack: {
      height: 9,
      overflow: "hidden",
      borderRadius: 5,
      backgroundColor: theme.inputBackground,
    },
    progressFill: {
      height: "100%",
      borderRadius: 5,
      backgroundColor: theme.paymentColor,
    },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    progressLabel: {
      color: theme.textMuted,
      fontSize: 9,
      lineHeight: 12,
    },
    periodDivider: {
      height: 1,
      marginTop: 2,
      backgroundColor: theme.border,
    },
    periodTitle: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
    },
    periodRow: {
      flexDirection: "row",
      alignItems: "stretch",
    },
    periodItem: {
      minWidth: 0,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },
    periodVerticalDivider: {
      width: 1,
      marginHorizontal: 12,
      backgroundColor: theme.border,
    },
    periodDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      flexShrink: 0,
    },
    debtDot: {
      backgroundColor: theme.debtColor,
    },
    paymentDot: {
      backgroundColor: theme.paymentColor,
    },
    periodContent: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    periodLabel: {
      color: theme.textMuted,
      fontSize: 9,
      lineHeight: 12,
    },
    periodValue: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    debtText: {
      color: theme.debtColor,
    },
    paymentText: {
      color: theme.paymentColor,
    },
    sectionHeader: {
      minHeight: 42,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      paddingTop: 2,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "800",
      letterSpacing: -0.25,
    },
    sectionSubtitle: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    countBadge: {
      minWidth: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      borderRadius: 15,
      backgroundColor: theme.primaryLight,
    },
    countBadgeText: {
      color: theme.primary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
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
    debtorRow: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    rankBadge: {
      width: 22,
      height: 22,
      borderRadius: 11,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    rankText: {
      color: theme.textSecondary,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "800",
    },
    avatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.debtBg,
    },
    avatarText: {
      color: theme.debtColor,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "800",
    },
    debtorIdentity: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    debtorName: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
    },
    debtorPhone: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 14,
      fontVariant: ["tabular-nums"],
    },
    debtorAmountWrap: {
      width: 92,
      alignItems: "flex-end",
      gap: 1,
    },
    debtorAmount: {
      width: "100%",
      color: theme.debtColor,
      fontSize: 12,
      lineHeight: 16,
      textAlign: "right",
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    debtorCaption: {
      color: theme.textMuted,
      fontSize: 9,
      lineHeight: 12,
    },
    monthRow: {
      gap: 9,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    monthTitle: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
    },
    flowRow: {
      minHeight: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    flowLabelWrap: {
      width: 51,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    flowDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    flowLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      lineHeight: 14,
    },
    flowTrack: {
      minWidth: 40,
      height: 7,
      flex: 1,
      overflow: "hidden",
      borderRadius: 4,
      backgroundColor: theme.inputBackground,
    },
    flowFill: {
      height: "100%",
      borderRadius: 4,
    },
    debtFill: {
      backgroundColor: theme.debtColor,
    },
    paymentFill: {
      backgroundColor: theme.paymentColor,
    },
    flowValue: {
      width: 92,
      fontSize: 10,
      lineHeight: 14,
      textAlign: "right",
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    emptyState: {
      minHeight: 130,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      padding: 20,
    },
    emptyIconGreen: {
      width: 48,
      height: 48,
      marginBottom: 4,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.paymentBg,
    },
    emptyIconBlue: {
      width: 48,
      height: 48,
      marginBottom: 4,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    emptyTitle: {
      color: theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
    },
    emptyDescription: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 16,
      textAlign: "center",
    },
    pressed: {
      backgroundColor: theme.inputBackground,
    },
    footerSpace: {
      height: 10,
    },
  });
