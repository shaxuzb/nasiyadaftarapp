import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { CustomerEditSheet } from "../modules/clients/components/CustomerEditSheet";
import { useClientDetail } from "../modules/clients/hooks/useClientDetail";
import { getInitials } from "../utils";
import { APP_NAME } from "../constants";
import { AppTheme, RootStackParamList } from "../types";
import { useBottomSheet } from "../bottom-sheet";
import { useTheme } from "../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedDisplayedBalance,
  getLocalizedApiErrorMessage,
  useTranslation,
  type TranslateKey,
} from "../i18n";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "CustomerDetail">;
type TxDateFilter = "all" | "today" | "7d" | "30d";
const filters: { key: TxDateFilter; labelKey: TranslateKey }[] = [
  { key: "all", labelKey: "transactions.dateFilterAll" },
  { key: "today", labelKey: "transactions.dateFilterToday" },
  { key: "7d", labelKey: "transactions.dateFilter7d" },
  { key: "30d", labelKey: "transactions.dateFilter30d" },
];

export function CustomerDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { locale, t } = useTranslation();
  const {
    params: { customerId },
  } = useRoute<Route>();
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const { confirm } = useConfirmDialog();
  const { deleteCustomer } = useApp();
  const { detail, history, update } = useClientDetail(customerId);
  const customer = detail.data;
  const [txDateFilter, setTxDateFilter] = useState<TxDateFilter>("all");
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const deletePending = useRef(false);

  const { txs, totalDebt, totalPaid } = useMemo(() => {
    const txs = [...(history.data ?? [])].sort(
      (a, b) =>
        (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0) || b.id - a.id,
    );
    let totalDebt = 0;
    let totalPaid = 0;
    for (const tx of txs) {
      if (tx.type === "debt") totalDebt += tx.amount;
      else totalPaid += tx.amount;
    }
    return { txs, totalDebt, totalPaid };
  }, [history.data]);
  const balance =
    customer?.currentBalance ??
    (history.data ? totalDebt - totalPaid : undefined);
  const filteredTxs = useMemo(() => {
    if (txDateFilter === "all") return txs;
    const now = new Date();
    return txs.filter((tx) => {
      const date = new Date(tx.date);
      if (txDateFilter === "today")
        return date.toDateString() === now.toDateString();
      const elapsed = now.getTime() - date.getTime();
      return (
        elapsed >= 0 && elapsed <= (txDateFilter === "7d" ? 7 : 30) * 86_400_000
      );
    });
  }, [txDateFilter, txs]);

  function goBack() {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("MainTabs");
  }

  async function openContact(whatsApp = false) {
    if (!customer) return;
    const customerName =
      customer.fullName.trim() ||
      customer.phone ||
      t("transactions.customerFallback");
    const message =
      `${t("customers.sheetTitle")}, ${customerName}!\n${APP_NAME}` +
      (balance === undefined
        ? ""
        : `\n${t("transactions.balance")}: ${formatLocalizedCurrency(Math.max(balance, 0), locale)}`);
    const url = whatsApp
      ? `https://wa.me/${customer.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
      : `tel:${customer.phone}`;
    try {
      await Linking.openURL(url);
    } catch {
      showToast(
        whatsApp
          ? t("transactions.whatsappError")
          : t("transactions.callError"),
        "error",
      );
    }
  }

  async function share() {
    if (!customer) return;
    const customerName =
      customer.fullName.trim() ||
      customer.phone ||
      t("transactions.customerFallback");
    const totals = history.data
      ? `\n${t("transactions.totalDebt")}: ${formatLocalizedCurrency(totalDebt, locale)}\n${t("transactions.totalPayment")}: ${formatLocalizedCurrency(totalPaid, locale)}`
      : "";
    try {
      await Share.share({
        message:
          `${APP_NAME}\n${t("transactions.customer")}: ${customerName}\n${t("transactions.phone")}: ${customer.phone}${totals}` +
          (balance === undefined
            ? ""
            : `\n${t("transactions.balance")}: ${formatLocalizedDisplayedBalance(balance, locale)}`) +
          `\n${t("transactions.date")}: ${formatLocalizedDate(new Date(), locale)}`,
      });
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "transactions.shareError", t),
        "error",
      );
    }
  }

  async function remove() {
    if (deletePending.current) return;
    deletePending.current = true;
    try {
      const accepted = await confirm({
        title: t("transactions.deleteTitle"),
        message: t("transactions.deleteMessage"),
        confirmText: t("transactions.delete"),
        cancelText: t("common.cancel"),
        variant: "danger",
      });
      if (!accepted) return;
      setDeleting(true);
      await deleteCustomer(customerId);
      showToast(t("transactions.deleted"), "success");
      goBack();
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "transactions.deleteError", t),
        "error",
      );
    } finally {
      deletePending.current = false;
      setDeleting(false);
    }
  }

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        onPress={goBack}
        style={styles.headerButton}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      <Text style={styles.headerCaption}>{t("transactions.customerData")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("transactions.addTransaction")}
        accessibilityState={{ expanded: showActions }}
        onPress={() => setShowActions((value) => !value)}
        disabled={!customer || deleting}
        style={styles.headerButton}
      >
        {/* <Ionicons
          name={showActions ? "close" : "ellipsis-vertical"}
          size={22}
          color={theme.text}
        /> */}
      </Pressable>
    </View>
  );

  if (!customer)
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {header}
        <View style={styles.centered}>
          {detail.isPending ? (
            <ActivityIndicator size="large" color={theme.primary} />
          ) : (
            <EmptyState
              iconName="cloud-offline-outline"
              title={t("transactions.dataLoadError")}
              description={getLocalizedApiErrorMessage(
                detail.error,
                "customers.fetchErrorDescription",
                t,
              )}
              action={
                <PrimaryButton
                  label={t("customers.retry")}
                  onPress={() => void detail.refetch()}
                />
              }
            />
          )}
        </View>
      </SafeAreaView>
    );

  const balanceColor =
    balance === undefined
      ? theme.textMuted
      : balance > 0
        ? theme.debtColor
        : theme.paymentColor;
  const blacklistedOrganizationNames = [
    ...new Set(
      (customer.blacklistedOrganizations ?? [])
        .map((item) => item.name.trim())
        .filter(Boolean),
    ),
  ];
  const blacklistedOrganizationCount = Math.max(
    customer.blacklistedOrganizationCount ?? 0,
    blacklistedOrganizationNames.length,
  );
  const showBlacklistBadge =
    customer.isBlacklisted === true || blacklistedOrganizationCount > 0;
  const displayName =
    customer.fullName.trim() ||
    customer.phone ||
    t("transactions.customerFallback");

  function openTransactionSheet() {
    if (!customer || deleting) return;
    openSheet("transaction", {
      customerId,
      customerName: displayName,
      customerPhone: customer.phone,
      onOpenProfile: () =>
        navigation.navigate("CustomerDetail", {
          customerId,
        }),
      currentBalance: balance,
    });
  }

  const deleteLabel = t("transactions.delete");
  const footerActions: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    onPress: () => void;
  }[] = [
    {
      label: t("transactions.call"),
      icon: "call",
      color: theme.primary,
      onPress: () => void openContact(),
    },
    {
      label: t("transactions.whatsapp"),
      icon: "logo-whatsapp",
      color: theme.paymentColor,
      onPress: () => void openContact(true),
    },
    {
      label: t("transactions.share"),
      icon: "share-social-outline",
      color: theme.primary,
      onPress: () => void share(),
    },
    {
      label: t("transactions.edit"),
      icon: "create-outline",
      color: theme.textSecondary,
      onPress: () => setEditing(true),
    },
    {
      label: deleteLabel,
      icon: "trash-outline",
      color: theme.dangerColor,
      onPress: () => void remove(),
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {header}
      <FlatList
        data={filteredTxs}
        keyExtractor={(tx) => String(tx.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        refreshing={detail.isRefetching || history.isRefetching}
        onRefresh={() => {
          void detail.refetch();
          void history.refetch();
        }}
        ListHeaderComponent={
          <>
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{getInitials(customer)}</Text>
              </View>
              <View style={styles.identityText}>
                <Text style={styles.name} numberOfLines={2}>
                  {displayName}
                </Text>
                <Text
                  selectable={Boolean(customer.phone.trim())}
                  style={[
                    styles.phone,
                    !customer.phone.trim() && styles.phoneMissing,
                  ]}
                  numberOfLines={1}
                >
                  {customer.phone.trim() || t("customers.phoneMissing")}
                </Text>
                {showBlacklistBadge ? (
                  <View
                    accessible
                    accessibilityLabel={`${t("transactions.otherOrganizationsBlacklist")}${
                      blacklistedOrganizationCount > 0
                        ? t("transactions.organizationsCount", {
                            count: blacklistedOrganizationCount,
                          })
                        : ""
                    }`}
                    style={styles.blacklistBadge}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={12}
                      color={theme.dangerColor}
                    />
                    <Text
                      style={styles.blacklistBadgeText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {t("transactions.otherOrganizationsBlacklist")}
                    </Text>
                  </View>
                ) : null}
              </View>
              {balance !== undefined && (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        balance > 0 ? theme.debtBg : theme.paymentBg,
                    },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: balanceColor }]}>
                    {balance > 0
                      ? t("transactions.debtStatus")
                      : t("transactions.noDebtStatus")}
                  </Text>
                </View>
              )}
            </View>
            {!!customer.note?.trim() && (
              <Text selectable style={styles.note}>
                {customer.note}
              </Text>
            )}
            <View style={styles.stats}>
              {[
                {
                  label: t("transactions.totalDebt"),
                  value: history.data
                    ? formatLocalizedCurrency(totalDebt, locale)
                    : "—",
                  color: theme.debtColor,
                },
                {
                  label: t("transactions.totalPayment"),
                  value: history.data
                    ? formatLocalizedCurrency(totalPaid, locale)
                    : "—",
                  color: theme.paymentColor,
                },
                {
                  label: t("transactions.balance"),
                  value:
                    balance === undefined
                      ? "—"
                      : formatLocalizedDisplayedBalance(balance, locale),
                  color: balanceColor,
                },
              ].map((stat, index) => (
                <View
                  key={stat.label}
                  style={[styles.stat, index > 0 && styles.statBorder]}
                >
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text
                    selectable
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    style={[styles.statAmount, { color: stat.color }]}
                  >
                    {stat.value}
                  </Text>
                </View>
              ))}
            </View>
            {detail.isError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void detail.refetch()}
                style={styles.error}
              >
                <Text style={styles.errorText}>
                  {t("transactions.dataRefreshError")}
                </Text>
              </Pressable>
            )}
            {showActions && (
              <View style={styles.tools}>
                <View style={styles.transactionActions}>
                  {(["debt", "payment"] as const).map((type) => (
                    <Pressable
                      key={type}
                      accessibilityRole="button"
                      disabled={deleting}
                      onPress={() => {
                        setShowActions(false);
                        openSheet("transaction", {
                          customerId,
                          type,
                          customerName: displayName,
                          customerPhone: customer.phone,
                          onOpenProfile: () =>
                            navigation.navigate("CustomerDetail", {
                              customerId,
                            }),
                          currentBalance: balance,
                        });
                      }}
                      style={[
                        styles.transactionAction,
                        {
                          backgroundColor:
                            type === "debt"
                              ? theme.primaryLight
                              : theme.paymentBg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          type === "debt"
                            ? "add-circle-outline"
                            : "wallet-outline"
                        }
                        size={20}
                        color={
                          type === "debt" ? theme.primary : theme.paymentColor
                        }
                      />
                      <Text
                        style={[
                          styles.transactionLabel,
                          {
                            color:
                              type === "debt"
                                ? theme.primary
                                : theme.paymentColor,
                          },
                        ]}
                      >
                        {type === "debt"
                          ? t("transactions.addDebt")
                          : t("transactions.takePayment")}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.filters}>
                  {filters.map((filter) => (
                    <Pressable
                      key={filter.key}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: filter.key === txDateFilter,
                      }}
                      onPress={() => setTxDateFilter(filter.key)}
                      style={[
                        styles.filter,
                        filter.key === txDateFilter && styles.filterActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          filter.key === txDateFilter && {
                            color: theme.primary,
                          },
                        ]}
                      >
                        {t(filter.labelKey)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.section}>
              <Ionicons
                name="receipt-outline"
                size={22}
                color={theme.textSecondary}
              />
              <Text style={styles.sectionTitle}>
                {t("transactions.history")}
              </Text>
              {txDateFilter !== "all" && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("transactions.clearDateFilter")}
                  onPress={() => setTxDateFilter("all")}
                  style={styles.clearFilter}
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={22}
                    color={theme.primary}
                  />
                </Pressable>
              )}
            </View>
            {history.isError && (
              <Pressable
                accessibilityRole="button"
                onPress={() => void history.refetch()}
                style={styles.error}
              >
                <Text style={styles.errorText}>
                  {t("transactions.historyLoadError")}
                </Text>
              </Pressable>
            )}
          </>
        }
        renderItem={({ item: tx }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${formatLocalizedDate(tx.date, locale)}, ${tx.type === "debt" ? t("transactions.detailDebt") : t("transactions.detailPayment")}, ${formatLocalizedCurrency(tx.amount, locale)}`}
            onPress={() =>
              openSheet("transactionDetail", {
                transaction: tx,
                customerName: displayName,
              })
            }
            style={({ pressed }) => [styles.txRow, pressed && styles.pressed]}
          >
            <View style={styles.txCopy}>
              <Text style={styles.txDate}>
                {formatLocalizedDate(tx.date, locale)}
              </Text>
              <Text style={styles.txLabel}>{tx.note}</Text>
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[
                styles.txAmount,
                {
                  color:
                    tx.type === "debt" ? theme.debtColor : theme.paymentColor,
                },
              ]}
            >
              {tx.type === "debt" ? "−" : "+"}
              {formatLocalizedCurrency(tx.amount, locale)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
        )}
        ListEmptyComponent={
          history.isPending ? (
            <ActivityIndicator style={styles.loading} color={theme.primary} />
          ) : history.isError ? null : (
            <EmptyState
              iconName="receipt-outline"
              title={t("transactions.noTransactions")}
              description={
                txDateFilter === "all"
                  ? t("transactions.noTransactionsDescription")
                  : t("transactions.noFilteredTransactions")
              }
            />
          )
        }
      />
      <View
        onLayout={({ nativeEvent }) =>
          setFooterHeight(nativeEvent.layout.height)
        }
        style={styles.footer}
      >
        {footerActions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: deleting }}
            disabled={deleting}
            onPress={action.onPress}
            style={({ pressed }) => [
              styles.footerAction,
              pressed && styles.pressed,
            ]}
          >
            {deleting && action.label === deleteLabel ? (
              <ActivityIndicator color={action.color} />
            ) : (
              <Ionicons name={action.icon} size={25} color={action.color} />
            )}
            <Text
              style={[
                styles.footerLabel,
                action.label === deleteLabel && { color: theme.dangerColor },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("transactions.addTransaction")}
        accessibilityState={{ disabled: deleting }}
        disabled={deleting}
        onPress={openTransactionSheet}
        style={({ pressed }) => [
          styles.floatingActionButton,
          {
            bottom: (footerHeight > 0 ? footerHeight : 92) + insets.bottom + 12,
          },
          pressed && styles.pressed,
          deleting && styles.disabled,
        ]}
      >
        <Ionicons
          name="swap-horizontal-outline"
          size={28}
          color={theme.surface}
        />
      </Pressable>
      {editing && (
        <CustomerEditSheet
          customer={customer}
          onSave={update.mutateAsync}
          onClose={() => setEditing(false)}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.surface },
    header: {
      minHeight: 52,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCaption: {
      flex: 1,
      color: theme.textMuted,
      textAlign: "center",
      fontSize: 16,
    },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    list: { paddingHorizontal: 16, paddingBottom: 96, flexGrow: 1 },
    identity: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingTop: 12,
      paddingBottom: 24,
    },
    avatar: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: theme.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: { color: theme.primary, fontSize: 24, fontWeight: "700" },
    identityText: { flex: 1, minWidth: 0, gap: 4 },
    name: {
      color: theme.text,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    phone: {
      color: theme.textSecondary,
      fontSize: 14,
      fontVariant: ["tabular-nums"],
    },
    phoneMissing: { color: theme.textMuted },
    badge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      maxWidth: 85,
    },
    badgeText: { fontSize: 11, fontWeight: "700" },
    note: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      paddingBottom: 16,
    },
    stats: {
      flexDirection: "row",
      paddingVertical: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: theme.tabBarBorder,
    },
    stat: { flex: 1, minWidth: 0, gap: 6, paddingHorizontal: 8 },
    statBorder: {
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: theme.tabBarBorder,
    },
    statLabel: { color: theme.textSecondary, fontSize: 12, lineHeight: 17 },
    statAmount: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    blacklistBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.debtColor,
      backgroundColor: theme.debtBg,
    },
    blacklistBadgeText: {
      flexShrink: 1,
      color: theme.dangerColor,
      fontSize: 10,
      lineHeight: 13,
      fontWeight: "700",
    },
    tools: { paddingTop: 16, gap: 12 },
    transactionActions: { flexDirection: "row", gap: 10 },
    transactionAction: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    transactionLabel: { fontSize: 13, fontWeight: "700" },
    filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    filter: {
      paddingHorizontal: 12,
      minHeight: 36,
      justifyContent: "center",
      borderRadius: 999,
      backgroundColor: theme.inputBackground,
    },
    filterActive: { backgroundColor: theme.primaryLight },
    filterText: { color: theme.textSecondary, fontSize: 12, fontWeight: "600" },
    section: {
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      paddingVertical: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.tabBarBorder,
    },
    sectionTitle: {
      flex: 1,
      color: theme.text,
      fontSize: 17,
      fontWeight: "700",
    },
    clearFilter: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    txRow: {
      minHeight: 66,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.tabBarBorder,
    },
    txCopy: { flex: 1, minWidth: 0, gap: 3 },
    txDate: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    txLabel: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    txAmount: {
      maxWidth: "52%",
      fontSize: 16,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },
    footer: {
      flexDirection: "row",
      paddingHorizontal: 4,
      paddingTop: 8,
      paddingBottom: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.tabBarBorder,
      backgroundColor: theme.surface,
    },
    footerAction: {
      flex: 1,
      minWidth: 0,
      minHeight: 56,
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingHorizontal: 2,
    },
    footerLabel: {
      color: theme.textSecondary,
      fontSize: 10,
      lineHeight: 14,
      textAlign: "center",
    },
    floatingActionButton: {
      position: "absolute",
      right: 18,
      bottom: 78,
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 10,
      zIndex: 10,
    },
    error: { paddingVertical: 12 },
    errorText: { color: theme.dangerColor, fontSize: 13 },
    loading: { marginVertical: 40 },
    pressed: { opacity: 0.65 },
    disabled: { opacity: 0.5 },
  });
