import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { useReports } from "../modules/reports/hooks/useReports";
import type { ReportTopDebtor, ReportsResponse } from "../modules/reports/types";
import type { AppTheme, RootStackParamList } from "../types";
import { useTheme } from "../hooks/useTheme";
import { VideoLessonButton } from "../modules/video-lessons/components/VideoLessonEntry";
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
type DebtorLimit = 10 | 30 | 50;
const LIMIT_OPTIONS: readonly DebtorLimit[] = [10, 30, 50] as const;

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

function getNameInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type DebtorRowProps = {
  item: ReportTopDebtor;
  index: number;
  isLast: boolean;
  locale: string;
  debtCaption: string;
  phoneMissing: string;
  styles: ReturnType<typeof createStyles>;
  mutedColor: string;
  onOpen: (id: number) => void;
};

const DebtorRow = React.memo(function DebtorRow({
  item, index, isLast, locale, debtCaption, phoneMissing, styles, mutedColor, onOpen,
}: DebtorRowProps) {
  const balanceText = formatLocalizedCurrency(item.balance, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.fullName}, ${balanceText} ${debtCaption}`}
      onPress={() => onOpen(item.clientId)}
      style={({ pressed }) => [
        styles.debtorRow,
        index === 0 && styles.firstRow,
        isLast && styles.lastRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.rankBadge}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getNameInitials(item.fullName)}</Text>
      </View>
      <View style={styles.debtorIdentity}>
        <Text style={styles.debtorName} numberOfLines={2}>{item.fullName}</Text>
        <Text style={styles.debtorPhone} numberOfLines={1}>
          {item.phoneNumber || phoneMissing}
        </Text>
      </View>
      <View style={styles.debtorAmountWrap}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
          style={styles.debtorAmount}>
          {balanceText}
        </Text>
        <Text style={styles.debtorCaption}>{debtCaption}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={mutedColor} />
    </Pressable>
  );
});

export function ReportsScreen() {
  const theme = useTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const { locale, t } = useTranslation();
  const { showToast } = useToast();

  const [topDebtorsLimit, setTopDebtorsLimit] = React.useState<DebtorLimit>(10);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const params = React.useMemo(
    () => ({ months: 6, topDebtorsLimit }),
    [topDebtorsLimit],
  );
  const {
    report,
    error: dataError,
    isLoading,
    isFetching,
    refetch,
  } = useReports(params);
  const data = report ?? EMPTY_REPORT;
  const topDebtors = data.topDebtors;
  const isInitialLoading = isLoading && !report;
  const hasDebt = data.remainingBalance > 0;
  const hasOverpayment = data.remainingBalance < 0;

  const openDebtor = React.useCallback((customerId: number) => {
    navigation.navigate("CustomerDetail", { customerId });
  }, [navigation]);

  const handleRefresh = React.useCallback(async () => {
    if (isPullRefreshing) return;
    setIsPullRefreshing(true);
    try {
      const result = await refetch();
      if (result.error) {
        showToast(getLocalizedApiErrorMessage(result.error, "reports.loadErrorTitle", t), "error");
      }
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, showToast, t, isPullRefreshing]);

  const handleExport = React.useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      await exportClientsReport(t("reports.exportDialogTitle"));
      showToast(t("reports.exportReady"), "success");
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "reports.exportError", t), "error");
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, showToast, t]);

  const renderDebtor = React.useCallback(({ item, index }: {
    item: ReportTopDebtor; index: number;
  }) => (
    <DebtorRow
      item={item}
      index={index}
      isLast={index === topDebtors.length - 1}
      locale={locale}
      debtCaption={t("reports.debtCaption")}
      phoneMissing={t("customers.phoneMissing")}
      mutedColor={theme.textMuted}
      onOpen={openDebtor}
      styles={styles}
    />
  ), [topDebtors.length, locale, t, theme.textMuted, openDebtor, styles]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.screenTitle}>{t("reports.screenTitle")}</Text>
        </View>
        <VideoLessonButton lessonId="reports" />
        <Pressable accessibilityRole="button"
          accessibilityLabel={t("reports.exportA11y")}
          accessibilityState={{ disabled: isExporting, busy: isExporting }}
          disabled={isExporting} onPress={() => void handleExport()}
          style={({ pressed }) => [
            styles.headerExportButton, pressed && styles.pressed,
            isExporting && styles.exportDisabled,
          ]}>
          {isExporting
            ? <ActivityIndicator size="small" color={theme.primary} />
            : <Ionicons name="download-outline" size={18} color={theme.primary} />}
          <Text style={styles.exportText}>{t("reports.export")}</Text>
        </Pressable>
      </View>

      <FlatList<ReportTopDebtor>
        data={isInitialLoading || (dataError && !report) ? [] : topDebtors}
        keyExtractor={(item) => String(item.clientId)}
        renderItem={renderDebtor}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews={Platform.OS === "android"}
        refreshControl={
          <RefreshControl refreshing={isPullRefreshing}
            onRefresh={() => void handleRefresh()}
            colors={[theme.primary]} tintColor={theme.primary} />
        }
        ListHeaderComponent={
          dataError && !report ? (
            <EmptyState iconName="cloud-offline-outline"
              title={t("reports.loadErrorTitle")}
              description={getLocalizedApiErrorMessage(dataError, "reports.loadErrorDescription", t)}
              action={<PrimaryButton label={t("reports.retry")} onPress={() => void handleRefresh()} />} />
          ) : isInitialLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={styles.loadingText}>{t("reports.loading")}</Text>
            </View>
          ) : (
            <View style={styles.listHeader}>
              <View style={[
                styles.heroCard, hasDebt ? styles.heroDebtCard : styles.heroSuccessCard,
              ]}>
                <Text style={[styles.heroLabel, {
                  color: hasDebt ? theme.debtColor : theme.paymentColor,
                }]}>
                  {hasDebt ? t("reports.heroDebt") : hasOverpayment
                    ? t("reports.heroOverpayment") : t("reports.heroNoDebt")}
                </Text>
                <Text selectable numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.68}
                  style={[styles.heroValue, {
                    color: hasDebt ? theme.debtColor : theme.paymentColor,
                  }]}>
                  {formatLocalizedDisplayedBalance(data.remainingBalance, locale)}
                </Text>
                {!hasDebt ? (
                  <Text style={styles.heroCaption}>
                    {hasOverpayment ? t("reports.heroOverpaymentCaption") : t("reports.heroSettledCaption")}
                  </Text>
                ) : null}
              </View>

              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t("reports.topDebtors")}</Text>
                  <Text style={styles.sectionSubtitle}>{t("reports.topDebtorsSubtitle")}</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{topDebtors.length}</Text>
                </View>
              </View>

              <View style={styles.limitBar}>
                <Text style={styles.limitLabel}>{t("reports.showCount")}</Text>
                <View style={styles.limitOptions} accessibilityRole="radiogroup">
                  {LIMIT_OPTIONS.map((limit) => (
                    <Pressable key={limit} accessibilityRole="radio"
                      accessibilityLabel={t("reports.topCountOption", { count: limit })}
                      accessibilityState={{ selected: topDebtorsLimit === limit }}
                      onPress={() => setTopDebtorsLimit(limit)}
                      style={({ pressed }) => [
                        styles.limitOption,
                        topDebtorsLimit === limit && styles.limitOptionSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[
                        styles.limitOptionText,
                        topDebtorsLimit === limit && styles.limitOptionTextSelected,
                      ]}>{limit}</Text>
                    </Pressable>
                  ))}
                </View>
                {isFetching && !isPullRefreshing ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : null}
              </View>
            </View>
          )
        }
        ListEmptyComponent={
          !isInitialLoading && !(dataError && !report) ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={27} color={theme.paymentColor} />
              <Text style={styles.emptyTitle}>{t("reports.activeDebtorsEmpty")}</Text>
              <Text style={styles.emptyDescription}>{t("reports.allSettled")}</Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={styles.footerSpace} />}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  header: { minHeight: 68, flexDirection: "row", alignItems: "center",
    gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerCopy: { minWidth: 0, flex: 1 },
  screenTitle: { color: theme.text, fontSize: 28, lineHeight: 39, fontWeight: "800", letterSpacing: -0.8 },
  headerExportButton: { minWidth: 76, minHeight: 44, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
    paddingHorizontal: 11, borderWidth: 1, borderColor: theme.border,
    borderRadius: 14, backgroundColor: theme.surface, boxShadow: theme.cardShadow },
  exportDisabled: { opacity: 0.62 },
  exportText: { color: theme.primary, fontSize: 12, lineHeight: 16, fontWeight: "800" },
  scroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  loadingWrap: { minHeight: 360, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: theme.textSecondary, fontSize: 14, lineHeight: 20 },
  listHeader: { gap: 14, paddingBottom: 10 },
  heroCard: { padding: 18, gap: 4, borderRadius: 22, borderWidth: 1, boxShadow: theme.cardShadow },
  heroDebtCard: { backgroundColor: theme.debtBg, borderColor: theme.debtColor },
  heroSuccessCard: { backgroundColor: theme.paymentBg, borderColor: theme.paymentColor },
  heroLabel: { color: theme.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  heroValue: { color: theme.text, fontSize: 31, lineHeight: 38,
    fontWeight: "800", letterSpacing: -0.8, fontVariant: ["tabular-nums"] },
  heroCaption: { color: theme.textSecondary, fontSize: 12, lineHeight: 17 },
  sectionHeader: { minHeight: 42, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", gap: 12 },
  sectionHeading: { flex: 1, minWidth: 0, gap: 3 },
  sectionTitle: { color: theme.text, fontSize: 18, lineHeight: 23, fontWeight: "800", letterSpacing: -0.25 },
  sectionSubtitle: { color: theme.textMuted, fontSize: 11, lineHeight: 15 },
  countBadge: { minWidth: 30, height: 30, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 8, borderRadius: 15, backgroundColor: theme.primaryLight },
  countBadgeText: { color: theme.primary, fontSize: 12, lineHeight: 16, fontWeight: "800",
    fontVariant: ["tabular-nums"] },
  limitBar: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8 },
  limitLabel: { flex: 1, color: theme.textSecondary, fontSize: 12 },
  limitOptions: { flexDirection: "row", alignItems: "center", backgroundColor: theme.inputBackground,
    borderRadius: 11, padding: 3, gap: 2 },
  limitOption: { minWidth: 43, minHeight: 34, borderRadius: 8, justifyContent: "center", alignItems: "center",
    paddingHorizontal: 7 },
  limitOptionSelected: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.primary },
  limitOptionText: { color: theme.textSecondary, fontSize: 12, fontWeight: "700" },
  limitOptionTextSelected: { color: theme.primary, fontWeight: "800" },
  debtorRow: { minHeight: 67, flexDirection: "row", alignItems: "center", gap: 9,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.surface,
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: theme.border },
  firstRow: { borderTopWidth: 1, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  lastRow: { borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  rankBadge: { width: 22, height: 22, borderRadius: 11, flexShrink: 0,
    alignItems: "center", justifyContent: "center", backgroundColor: theme.inputBackground },
  rankText: { color: theme.textSecondary, fontSize: 10, fontWeight: "800" },
  avatar: { width: 38, height: 38, borderRadius: 19, flexShrink: 0,
    alignItems: "center", justifyContent: "center", backgroundColor: theme.debtBg },
  avatarText: { color: theme.debtColor, fontSize: 13, fontWeight: "800" },
  debtorIdentity: { minWidth: 0, flex: 1, gap: 1 },
  debtorName: { color: theme.text, fontSize: 13, lineHeight: 18, fontWeight: "700" },
  debtorPhone: { color: theme.textMuted, fontSize: 10, lineHeight: 14, fontVariant: ["tabular-nums"] },
  debtorAmountWrap: { width: 92, alignItems: "flex-end", gap: 1 },
  debtorAmount: { width: "100%", color: theme.debtColor, fontSize: 12, lineHeight: 16,
    textAlign: "right", fontWeight: "800", fontVariant: ["tabular-nums"] },
  debtorCaption: { color: theme.textMuted, fontSize: 9, lineHeight: 12 },
  emptyState: { minHeight: 168, backgroundColor: theme.surface, borderWidth: 1,
    borderColor: theme.border, borderRadius: 18, alignItems: "center",
    justifyContent: "center", gap: 8, padding: 20 },
  emptyTitle: { color: theme.text, fontSize: 15, fontWeight: "800", textAlign: "center" },
  emptyDescription: { color: theme.textMuted, fontSize: 12, textAlign: "center" },
  footerSpace: { height: 28 },
  pressed: { opacity: 0.7 },
});
