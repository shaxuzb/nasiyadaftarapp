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

import { useApp } from "../context/AppContext";
import { useReports } from "../modules/reports/hooks/useReports";
import { formatCurrency, getFullName, getInitials } from "../utils";
import { RootStackParamList } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface MetricCardProps {
  icon: IconName;
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
}

const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
] as const;

const MetricCard = React.memo(function MetricCard({
  icon,
  label,
  value,
  color,
  backgroundColor,
}: MetricCardProps) {
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

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;
  return `${MONTHS[monthIndex] ?? month} ${year}`;
}

function getBarWidth(value: number, max: number): `${number}%` {
  if (value <= 0 || max <= 0) return "0%";
  return `${Math.max(4, Math.round((value / max) * 100))}%`;
}

export function ReportsScreen() {
  const navigation = useNavigation<Nav>();
  const {
    customers,
    transactions,
    isLoadingData,
    refreshCustomers,
  } = useApp();
  const { stats, topDebtors, monthlyMap } = useReports(customers, transactions);

  const remainingBalance = Math.max(stats.remainingBalance, 0);
  const settledCustomers = Math.max(
    stats.totalCustomers - stats.activeDebtorsCount,
    0,
  );
  const paymentPercent =
    stats.totalDebt > 0
      ? Math.min(100, Math.round((stats.totalPaid / stats.totalDebt) * 100))
      : 0;
  const currentMonth = monthlyMap.find(
    ([month]) => month === getCurrentMonthKey(),
  )?.[1] ?? { debt: 0, payment: 0 };
  const monthlyMax = monthlyMap.reduce(
    (max, [, data]) => Math.max(max, data.debt, data.payment),
    0,
  );
  const isInitialLoading =
    isLoadingData && customers.length === 0 && transactions.length === 0;

  const heroMessage =
    stats.totalDebt === 0
      ? "Hozircha qarz yozilmagan"
      : remainingBalance === 0
        ? "Barcha qarzlar yopilgan"
        : `${stats.activeDebtorsCount} mijozda faol qarz bor`;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Hisobot</Text>
        <Text style={styles.screenSubtitle}>
          Biznesingizdagi pul oqimini kuzating
        </Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingData && !isInitialLoading}
            onRefresh={() => {
              void refreshCustomers();
            }}
            colors={["#0B5DEB"]}
            tintColor="#0B5DEB"
          />
        }
      >
        {isInitialLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#0B5DEB" />
            <Text style={styles.loadingText}>Hisobot tayyorlanmoqda...</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroTop}>
                <View style={styles.heroIcon}>
                  <Ionicons name="wallet-outline" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.heroStatus}>
                  <View style={styles.liveDot} />
                  <Text style={styles.heroStatusText}>Joriy holat</Text>
                </View>
              </View>

              <Text style={styles.heroLabel}>Qoldiq qarz</Text>
              <Text
                selectable
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.68}
                style={styles.heroValue}
              >
                {formatCurrency(remainingBalance)}
              </Text>
              <Text style={styles.heroMessage}>{heroMessage}</Text>

              <View style={styles.heroDivider} />
              <View style={styles.heroSummary}>
                <View style={styles.heroSummaryItem}>
                  <Text selectable style={styles.heroSummaryValue}>
                    {stats.activeDebtorsCount}
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
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={styles.metricRow}>
                <MetricCard
                  icon="arrow-down"
                  label="Jami qarz berildi"
                  value={formatCurrency(stats.totalDebt)}
                  color="#F4511E"
                  backgroundColor="#FFF0E8"
                />
                <MetricCard
                  icon="arrow-up"
                  label="Jami to'lov olindi"
                  value={formatCurrency(stats.totalPaid)}
                  color="#159447"
                  backgroundColor="#E7F8ED"
                />
              </View>
              <View style={styles.metricRow}>
                <MetricCard
                  icon="people"
                  label="Barcha mijozlar"
                  value={String(stats.totalCustomers)}
                  color="#0B5DEB"
                  backgroundColor="#E7F0FF"
                />
                <MetricCard
                  icon="swap-horizontal"
                  label="Amaliyotlar"
                  value={String(transactions.length)}
                  color="#7C3AED"
                  backgroundColor="#F1EAFE"
                />
              </View>
            </View>

            <View style={styles.paymentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.sectionIconGreen}>
                  <Ionicons name="analytics" size={19} color="#159447" />
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
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Eng ko'p qarzdorlar</Text>
                <Text style={styles.sectionSubtitle}>
                  E'tibor talab qiladigan mijozlar
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
                      color="#159447"
                    />
                  </View>
                  <Text style={styles.emptyTitle}>Faol qarzdor yo'q</Text>
                  <Text style={styles.emptyDescription}>
                    Barcha mijozlarning hisobi yopilgan
                  </Text>
                </View>
              ) : (
                topDebtors.map((entry, index) => (
                  <Pressable
                    key={entry.customer.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${getFullName(entry.customer)}, ${formatCurrency(entry.balance)} qarz`}
                    onPress={() =>
                      navigation.navigate("CustomerDetail", {
                        customerId: entry.customer.id,
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
                        {getInitials(entry.customer)}
                      </Text>
                    </View>
                    <View style={styles.debtorIdentity}>
                      <Text style={styles.debtorName} numberOfLines={1}>
                        {getFullName(entry.customer)}
                      </Text>
                      <Text selectable style={styles.debtorPhone} numberOfLines={1}>
                        {entry.customer.phone}
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
                        {formatCurrency(entry.balance)}
                      </Text>
                      <Text style={styles.debtorCaption}>qarz</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9AA8BB" />
                  </Pressable>
                ))
              )}
            </View>

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Oylik pul oqimi</Text>
                <Text style={styles.sectionSubtitle}>So'nggi 6 oy ko'rsatkichlari</Text>
              </View>
            </View>

            <View style={styles.listCard}>
              {monthlyMap.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={styles.emptyIconBlue}>
                    <Ionicons name="bar-chart" size={25} color="#0B5DEB" />
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
            </View>

            <View style={styles.footerSpace} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 2,
  },
  screenTitle: {
    color: "#071426",
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  screenSubtitle: {
    color: "#60728F",
    fontSize: 15,
    lineHeight: 21,
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
    color: "#60728F",
    fontSize: 14,
    lineHeight: 20,
  },
  heroCard: {
    overflow: "hidden",
    padding: 18,
    gap: 4,
    backgroundColor: "#0B5DEB",
    borderRadius: 22,
    borderCurve: "continuous",
    boxShadow: "0 10px 24px rgba(11, 93, 235, 0.24)",
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
    backgroundColor: "#72E69A",
  },
  heroStatusText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  heroLabel: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "800",
    letterSpacing: -0.8,
    fontVariant: ["tabular-nums"],
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
    minHeight: 82,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 11,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E9F2",
    borderRadius: 17,
    borderCurve: "continuous",
    boxShadow: "0 5px 16px rgba(24, 48, 80, 0.06)",
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
    color: "#657692",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E9F2",
    borderRadius: 18,
    borderCurve: "continuous",
    boxShadow: "0 6px 18px rgba(24, 48, 80, 0.06)",
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
    backgroundColor: "#E7F8ED",
  },
  cardHeaderText: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  cardTitle: {
    color: "#10284B",
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },
  cardSubtitle: {
    color: "#71819A",
    fontSize: 10,
    lineHeight: 14,
  },
  paymentPercent: {
    color: "#159447",
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 9,
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "#E9EEF5",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    backgroundColor: "#159447",
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "#8795A9",
    fontSize: 9,
    lineHeight: 12,
  },
  periodDivider: {
    height: 1,
    marginTop: 2,
    backgroundColor: "#E8EDF3",
  },
  periodTitle: {
    color: "#526783",
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
    backgroundColor: "#E4EAF1",
  },
  periodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  debtDot: {
    backgroundColor: "#F4511E",
  },
  paymentDot: {
    backgroundColor: "#159447",
  },
  periodContent: {
    minWidth: 0,
    flex: 1,
    gap: 1,
  },
  periodLabel: {
    color: "#71819A",
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
    color: "#F4511E",
  },
  paymentText: {
    color: "#159447",
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
    color: "#10284B",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    color: "#71819A",
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
    backgroundColor: "#E7F0FF",
  },
  countBadgeText: {
    color: "#0B5DEB",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  listCard: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E9F2",
    borderRadius: 18,
    borderCurve: "continuous",
    boxShadow: "0 6px 18px rgba(24, 48, 80, 0.06)",
  },
  debtorRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F4F8",
  },
  rankText: {
    color: "#657692",
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
    backgroundColor: "#FFF0E8",
  },
  avatarText: {
    color: "#F4511E",
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
    color: "#102039",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  debtorPhone: {
    color: "#71819A",
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
    color: "#F4511E",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "right",
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  debtorCaption: {
    color: "#8795A9",
    fontSize: 9,
    lineHeight: 12,
  },
  monthRow: {
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  monthTitle: {
    color: "#10284B",
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
    color: "#657692",
    fontSize: 10,
    lineHeight: 14,
  },
  flowTrack: {
    minWidth: 40,
    height: 7,
    flex: 1,
    overflow: "hidden",
    borderRadius: 4,
    backgroundColor: "#EEF2F6",
  },
  flowFill: {
    height: "100%",
    borderRadius: 4,
  },
  debtFill: {
    backgroundColor: "#F4511E",
  },
  paymentFill: {
    backgroundColor: "#159447",
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
    minHeight: 158,
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
    backgroundColor: "#E7F8ED",
  },
  emptyIconBlue: {
    width: 48,
    height: 48,
    marginBottom: 4,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7F0FF",
  },
  emptyTitle: {
    color: "#10284B",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
  emptyDescription: {
    color: "#71819A",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  pressed: {
    backgroundColor: "#F7F9FC",
  },
  footerSpace: {
    height: 10,
  },
});
