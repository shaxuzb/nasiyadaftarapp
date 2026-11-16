import { VideoLessonButton } from "../modules/video-lessons/components/VideoLessonEntry";
import React, { memo, useCallback, useMemo, useRef, useState } from "react";
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
import type { Transaction } from "../modules/transactions/types";
import { formatDateOnly } from "../i18n/calendarLabels";
import { todayDateOnly } from "../utils/dateOnly";
import { findNextDue, unpaidDebts } from "../modules/transactions/utils/dueDate";
import { AppTheme, RootStackParamList } from "../types";
import { useBottomSheet } from "../bottom-sheet";
import { useTheme } from "../hooks/useTheme";
import { useThemeContext } from "../context/ThemeContext";
import { floatingActionElevation } from "../theme/floatingAction";
import { SavedDataNotice } from "../modules/offline/components/SavedDataNotice";
import { requireServer } from "../modules/offline/state/connectionNotice";
import { useMoney } from "../modules/currency/hooks/useMoney";
import {
  formatLocalizedDateTime,
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
  // A shadow on a light page, a glow on a dark one: see floatingActionElevation.
  const { resolvedScheme } = useThemeContext();
  const fabElevation = useMemo(
    () => floatingActionElevation(theme, resolvedScheme === "dark"),
    [resolvedScheme, theme],
  );
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { locale, t } = useTranslation();
  const money = useMoney();
  const {
    params: { customerId },
  } = useRoute<Route>();
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const { confirm } = useConfirmDialog();
  const { deleteCustomer } = useApp();
  const { detail, history, update, resolvedId } = useClientDetail(customerId);
  const customer = detail.data;
  // Added offline and not yet on the server: only debts and payments can be
  // written for it (they wait with it); changing or removing it waits too.
  const onlyOnPhone = resolvedId < 0;
  const showLockedNotice = () => showToast(t("offline.pendingCustomerLocked"), "info");
  // Editing needs the server: offline it says why (and opens once it is back).
  const openEditor = () => setEditing(true);
  const startEditing = () => {
    if (onlyOnPhone) showLockedNotice();
    else if (requireServer(openEditor)) openEditor();
  };
  const [txDateFilter, setTxDateFilter] = useState<TxDateFilter>("all");
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [footerHeight, setFooterHeight] = useState(0);
  const deletePending = useRef(false);

  const { txs, totalDebt, totalPaid } = useMemo(() => {
    // Not yet sent first (newest written first), then by date.
    const txs = [...(history.data ?? [])].sort(
      (a, b) =>
        Number(Boolean(b.pendingSync)) - Number(Boolean(a.pendingSync)) ||
        (a.pendingSync ? a.id - b.id : 0) ||
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
        : `\n${t("transactions.balance")}: ${money.format(Math.max(balance, 0))}`);
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
      ? `\n${t("transactions.totalDebt")}: ${money.format(totalDebt)}\n${t("transactions.totalPayment")}: ${money.format(totalPaid)}`
      : "";
    try {
      await Share.share({
        message:
          `${APP_NAME}\n${t("transactions.customer")}: ${customerName}\n${t("transactions.phone")}: ${customer.phone}${totals}` +
          (balance === undefined
            ? ""
            : `\n${t("transactions.balance")}: ${money.formatBalance(balance)}`) +
          `\n${t("transactions.date")}: ${formatLocalizedDateTime(new Date(), locale)}`,
      });
    } catch (error) {
      showToast(
        getLocalizedApiErrorMessage(error, "transactions.shareError", t),
        "error",
      );
    }
  }

  async function remove() {
    if (onlyOnPhone) {
      showLockedNotice();
      return;
    }
    // Deleting needs the server: offline it says why, and nothing is asked.
    if (!requireServer()) return;
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
      await deleteCustomer(resolvedId);
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
      <VideoLessonButton code="customer_detail" />
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

  // The rows stay as they are while the screen around them changes (the
  // actions menu, the footer measuring itself, a sheet opening): one memoised
  // row each, and the same open handler for all. The name is read when a row
  // is tapped, so the handler does not change with it.
  const customerNameRef = useRef("");
  const openTransactionDetail = useCallback(
    (tx: Transaction) =>
      openSheet("transactionDetail", {
        transaction: tx,
        customerName: customerNameRef.current,
      }),
    [openSheet],
  );
  // Payments pay the oldest debts first: a debt paid off has no return date
  // left to keep, and the nearest one still owed is shown under the balance.
  const unpaid = useMemo(() => unpaidDebts(txs), [txs]);
  const nextDue = useMemo(
    () => ((balance ?? 0) > 0 ? findNextDue(txs, todayDateOnly()) : null),
    [balance, txs],
  );
  const renderTransaction = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionRow
        tx={item}
        unpaid={unpaid.has(item.id)}
        onOpen={openTransactionDetail}
        theme={theme}
        styles={styles}
      />
    ),
    [openTransactionDetail, unpaid, styles, theme],
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
  const blacklistedOrganizations = customer.blacklistedOrganizations ?? [];
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
  customerNameRef.current = displayName;

  function openTransactionSheet() {
    if (!customer || deleting) return;
    openSheet("transaction", {
      customerId: resolvedId,
      customerName: displayName,
      customerPhone: customer.phone,
      isBlacklisted: showBlacklistBadge,
      onOpenProfile: () =>
        navigation.navigate("CustomerDetail", {
          customerId: resolvedId,
        }),
      currentBalance: balance,
    });
  }

  const deleteLabel = t("transactions.delete");
  const hasPhone = Boolean(customer.phone.trim());
  const addPhoneLabel = t("customers.addPhone");

  // Without a number, calling and messaging have nothing to act on: the dialer
  // would open empty and WhatsApp would ask who to send to. Rather than
  // disabling the buttons — which would leave no way forward from this screen —
  // they stay pressable and take the user to the one step that unblocks them.
  // They are muted so it is clear the call itself is not happening yet, and
  // they are not marked disabled, because they do respond.
  const footerActions: {
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    color: string;
    onPress: () => void;
    accessibilityLabel?: string;
    muted?: boolean;
  }[] = [
    {
      label: t("transactions.call"),
      icon: "call",
      color: hasPhone ? theme.primary : theme.textMuted,
      muted: !hasPhone,
      accessibilityLabel: hasPhone ? undefined : addPhoneLabel,
      onPress: hasPhone ? () => void openContact() : startEditing,
    },
    {
      label: t("transactions.whatsapp"),
      icon: "logo-whatsapp",
      color: hasPhone ? theme.paymentColor : theme.textMuted,
      muted: !hasPhone,
      accessibilityLabel: hasPhone ? undefined : addPhoneLabel,
      onPress: hasPhone ? () => void openContact(true) : startEditing,
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
      color: onlyOnPhone ? theme.textMuted : theme.textSecondary,
      muted: onlyOnPhone,
      onPress: startEditing,
    },
    {
      label: deleteLabel,
      icon: "trash-outline",
      color: onlyOnPhone ? theme.textMuted : theme.dangerColor,
      muted: onlyOnPhone,
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
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        refreshing={detail.isRefetching || history.isRefetching}
        onRefresh={() => {
          void detail.refetch();
          void history.refetch();
        }}
        ListHeaderComponent={
          <>
            <SavedDataNotice style={styles.savedNotice} />
            <View style={styles.identity}>
              <View style={styles.avatar}>
                <Text style={styles.initials}>{getInitials(customer)}</Text>
              </View>
              <View style={styles.identityText}>
                <Text style={styles.name}>
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
                {/* {hasPhone ? null : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${addPhoneLabel}: ${displayName}`}
                    hitSlop={6}
                    onPress={startEditing}
                    style={styles.phoneAction}
                  >
                    <Ionicons
                      name="create-outline"
                      size={13}
                      color={theme.primary}
                    />
                    <Text style={styles.phoneActionText}>{addPhoneLabel}</Text>
                  </Pressable>
                )} */}
                {showBlacklistBadge ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("customers.blacklistBadge")}${
                      blacklistedOrganizationCount > 0
                        ? t("transactions.organizationsCount", {
                            count: blacklistedOrganizationCount,
                          })
                        : ""
                    }`}
                    accessibilityHint={t("customers.blacklistDetailsHint")}
                    hitSlop={8}
                    onPress={() =>
                      openSheet("blacklistOrganizations", {
                        customerId,
                        customerName: displayName,
                        // Already loaded with this screen, so the sheet shows
                        // them without asking again.
                        organizations: blacklistedOrganizations,
                      })
                    }
                    style={({ pressed }) => [
                      styles.blacklistBadge,
                      pressed && styles.blacklistBadgePressed,
                    ]}
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
                      {t("customers.blacklistBadge")}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={theme.dangerColor}
                    />
                  </Pressable>
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
                // {
                //   label: t("transactions.totalDebt"),
                //   value: history.data
                //     ? money.format(totalDebt)
                //     : "—",
                //   color: theme.debtColor,
                // },
                // {
                //   label: t("transactions.totalPayment"),
                //   value: history.data
                //     ? money.format(totalPaid)
                //     : "—",
                //   color: theme.paymentColor,
                // },
                {
                  label: t("transactions.balance"),
                  value:
                    balance === undefined
                      ? "—"
                      : money.formatBalance(balance),
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
            {nextDue ? <NextDueCard due={nextDue} theme={theme} styles={styles} /> : null}
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
                          customerId: resolvedId,
                          type,
                          customerName: displayName,
                          customerPhone: customer.phone,
                          isBlacklisted: showBlacklistBadge,
                          onOpenProfile: () =>
                            navigation.navigate("CustomerDetail", {
                              customerId: resolvedId,
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
        renderItem={renderTransaction}
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
            accessibilityLabel={action.accessibilityLabel ?? action.label}
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
                action.muted && { color: theme.textMuted },
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
          fabElevation,
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

/**
 * Under the balance: the nearest return date still owed, how far off it is
 * (or how long ago it passed), and what is to be paid back by then.
 */
function NextDueCard({
  due,
  theme,
  styles,
}: {
  due: NonNullable<ReturnType<typeof findNextDue>>;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  const { t } = useTranslation();
  const money = useMoney();
  const late = due.days < 0;
  const soon = due.days <= 1;
  const tone = late ? theme.dangerColor : soon ? theme.warningColor : theme.primary;
  const when =
    due.days < 0
      ? t("transactions.dueDaysLate", { count: -due.days })
      : due.days === 0
        ? t("transactions.dueToday")
        : due.days === 1
          ? t("transactions.dueTomorrow")
          : t("transactions.dueDaysLeft", { count: due.days });
  const day = formatDateOnly(due.dueDate, t);
  const amount = t("transactions.dueAmount", { amount: money.format(due.amount) });

  return (
    <View
      accessible
      accessibilityLabel={`${t("transactions.dueCardTitle")}: ${day}, ${when}. ${amount}`}
      style={[styles.dueCard, { borderColor: late ? theme.dangerColor : theme.border }]}
    >
      <View style={[styles.dueIcon, { backgroundColor: `${tone}1F` }]}>
        <Ionicons name={late ? "alert-circle-outline" : "calendar-outline"} size={20} color={tone} />
      </View>
      <View style={styles.dueCopy}>
        <Text style={styles.dueTitle}>{t("transactions.dueCardTitle")}</Text>
        <Text style={styles.dueDay} numberOfLines={1}>
          {day}
        </Text>
        <Text style={styles.dueAmount} numberOfLines={1}>
          {amount}
        </Text>
      </View>
      <View style={[styles.dueChip, { backgroundColor: `${tone}1F` }]}>
        <Text style={[styles.dueChipText, { color: tone }]} numberOfLines={1}>
          {when}
        </Text>
      </View>
    </View>
  );
}

const TransactionRow = memo(function TransactionRow({
  tx,
  unpaid,
  onOpen,
  theme,
  styles,
}: {
  tx: Transaction;
  /** A debt not yet paid off (payments pay the oldest first). */
  unpaid: boolean;
  onOpen: (tx: Transaction) => void;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  const { locale, t } = useTranslation();
  const money = useMoney();
  const date = formatLocalizedDateTime(tx.date, locale);
  const amount = money.format(tx.amount);
  const isDebt = tx.type === "debt";
  const dueDate = isDebt && tx.dueDate ? tx.dueDate : null;
  const overdue = dueDate !== null && unpaid && dueDate < todayDateOnly();
  const dueDay = dueDate ? formatDateOnly(dueDate, t) : "";
  const dueLabel = !dueDate
    ? ""
    : !unpaid
      ? t("transactions.dueOnPaid", { date: dueDay })
      : overdue
        ? t("transactions.dueOnOverdue", { date: dueDay })
        : t("transactions.dueOn", { date: dueDay });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${date}, ${isDebt ? t("transactions.detailDebt") : t("transactions.detailPayment")}, ${amount}${dueLabel ? `, ${dueLabel}` : ""}`}
      onPress={() => onOpen(tx)}
      style={({ pressed }) => [styles.txRow, pressed && styles.pressed]}
    >
      <View style={styles.txCopy}>
        <Text style={styles.txDate}>{date}</Text>
        <Text style={styles.txLabel}>{tx.note}</Text>
        {dueDate ? (
          <View style={styles.txDue}>
            <Ionicons
              name={!unpaid ? "checkmark-circle-outline" : overdue ? "alert-circle" : "calendar-outline"}
              size={13}
              color={overdue ? theme.dangerColor : unpaid ? theme.textSecondary : theme.textMuted}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.txDueText,
                unpaid && { color: theme.textSecondary },
                overdue && { color: theme.dangerColor, fontWeight: "700" },
              ]}
            >
              {dueLabel}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[
          styles.txAmount,
          { color: isDebt ? theme.debtColor : theme.paymentColor },
        ]}
      >
        {isDebt ? "−" : "+"}
        {amount}
      </Text>
      <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
    </Pressable>
  );
});

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
      paddingBottom: 12,
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
    phoneAction: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 4,
      marginTop: 2,
      paddingVertical: 2,
    },
    phoneActionText: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: "600",
    },
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
      paddingVertical: 10,
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
    blacklistBadgePressed: { opacity: 0.6 },
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
    txDue: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
    dueCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 12,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      backgroundColor: theme.surface,
    },
    dueIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    dueCopy: { flex: 1, minWidth: 0, gap: 1 },
    dueTitle: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },
    dueDay: { color: theme.text, fontSize: 16, lineHeight: 21, fontWeight: "800" },
    dueAmount: { color: theme.textSecondary, fontSize: 12, lineHeight: 16 },
    dueChip: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
    dueChipText: { fontSize: 12, fontWeight: "800" },
    txDueText: { flexShrink: 1, color: theme.textMuted, fontSize: 12, lineHeight: 16, fontWeight: "600" },
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
    savedNotice: { marginBottom: 12 },
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
      zIndex: 10,
    },
    error: { paddingVertical: 12 },
    errorText: { color: theme.dangerColor, fontSize: 13 },
    loading: { marginVertical: 40 },
    pressed: { opacity: 0.65 },
    disabled: { opacity: 0.5 },
  });
