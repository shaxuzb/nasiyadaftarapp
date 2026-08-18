import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { TransactionItem } from "../modules/transactions/components/TransactionItem";
import { EmptyState } from "../components/EmptyState";
import { formatCurrency, formatDate, getFullName, getInitials } from "../utils";
import { APP_NAME } from "../constants";
import { AppTheme, RootStackParamList } from "../types";
import { useBottomSheet } from "../bottom-sheet";
import { useTheme } from "../hooks/useTheme";
import { getApiErrorMessage } from "../utils/apiError";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "CustomerDetail">;
type TxDateFilter = "all" | "today" | "7d" | "30d";

interface DetailStatProps {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  color: string;
  backgroundColor: string;
}

function DetailStat({
  icon,
  label,
  value,
  color,
  backgroundColor,
}: DetailStatProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIcon, { backgroundColor }]}>
        <Ionicons name={icon} size={21} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text
        selectable
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[styles.statAmount, { color }]}
      >
        {value}
      </Text>
    </View>
  );
}

export function CustomerDetailScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const { confirm } = useConfirmDialog();
  const { customerId } = route.params;
  const [txDateFilter, setTxDateFilter] = useState<TxDateFilter>("all");

  const {
    getCustomerById,
    transactions,
    deleteCustomer,
    loadCustomerDetail,
    loadCustomerHistory,
  } = useApp();

  const customer = getCustomerById(customerId);
  const { txs, balance, totalDebt, totalPaid } = useMemo(() => {
    const customerTransactions: typeof transactions = [];
    let debt = 0;
    let paid = 0;

    for (const transaction of transactions) {
      if (transaction.customerId !== customerId) continue;
      customerTransactions.push(transaction);
      if (transaction.type === "debt") debt += transaction.amount;
      else paid += transaction.amount;
    }

    return {
      txs: customerTransactions,
      balance: debt - paid,
      totalDebt: debt,
      totalPaid: paid,
    };
  }, [customerId, transactions]);

  const filteredTxs = useMemo(() => {
    if (txDateFilter === "all") return txs;

    const now = new Date();
    return txs.filter((transaction) => {
      const date = new Date(transaction.date);
      if (Number.isNaN(date.getTime())) return false;

      if (txDateFilter === "today") {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate()
        );
      }

      const days = txDateFilter === "7d" ? 7 : 30;
      const difference = now.getTime() - date.getTime();
      return difference >= 0 && difference <= days * 86_400_000;
    });
  }, [txDateFilter, txs]);

  useEffect(() => {
    void loadCustomerDetail(customerId);
    void loadCustomerHistory(customerId);
  }, [customerId, loadCustomerDetail, loadCustomerHistory]);

  function handleCall() {
    if (!customer) return;
    void Linking.openURL(`tel:${customer.phone}`).catch(() =>
      Alert.alert("Xatolik", "Qo'ng'iroq qilib bo'lmadi"),
    );
  }

  function handleWhatsApp() {
    if (!customer) return;
    const rawPhone = customer.phone.replace(/\D/g, "");
    const message =
      `Assalomu alaykum, ${getFullName(customer)}!\n\n` +
      `Sizning ${APP_NAME} daftarimizdagi nasiya qoldig'ingiz: ` +
      `${formatCurrency(Math.max(balance, 0))}\n\n` +
      "Iltimos, to'lovni amalga oshiring. Rahmat!";
    const url = `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
    void Linking.openURL(url).catch(() =>
      Alert.alert("Xatolik", "WhatsApp ochib bo'lmadi"),
    );
  }

  async function handleShare() {
    if (!customer) return;
    const message =
      `${APP_NAME.toUpperCase()} — HISOBOT\n` +
      `Mijoz: ${getFullName(customer)}\n` +
      `Telefon: ${customer.phone}\n\n` +
      `Jami nasiya: ${formatCurrency(totalDebt)}\n` +
      `To'langan: ${formatCurrency(totalPaid)}\n` +
      `Qoldiq: ${formatCurrency(Math.max(balance, 0))}\n` +
      `Sana: ${formatDate(new Date().toISOString())}`;
    await Share.share({ message });
  }

  async function handleDeleteCustomer() {
    const accepted = await confirm({
      title: "Mijozni o'chirish",
      message:
        "Bu amal qaytarilmaydi. Mijoz va barcha tranzaksiyalar o'chiriladi.",
      confirmText: "O'chirish",
      cancelText: "Bekor qilish",
      variant: "danger",
    });

    if (!accepted) return;

    try {
      await deleteCustomer(customerId);
      showToast("Mijoz o'chirildi", "success");
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.navigate("MainTabs");
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Mijozni o'chirishda xatolik"),
        "error",
      );
    }
  }

  if (!customer) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Mijoz topilmadi</Text>
      </View>
    );
  }

  const settled = balance <= 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orqaga qaytish"
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>

        <View style={styles.headerIdentity}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {getFullName(customer)}
          </Text>
          <Text selectable style={styles.headerSubtitle} numberOfLines={1}>
            {customer.phone}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mijozni o'chirish"
          onPress={handleDeleteCustomer}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="trash-outline" size={22} color={theme.dangerColor} />
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(customer)}</Text>
            </View>

            <View style={styles.profileIdentity}>
              <Text style={styles.profileName} numberOfLines={2}>
                {getFullName(customer)}
              </Text>
              <Text selectable style={styles.profilePhone} numberOfLines={1}>
                {customer.phone}
              </Text>
              <View style={styles.idBadge}>
                <Text selectable style={styles.idText}>
                  ID: {customer.id}
                </Text>
              </View>
            </View>

            <View style={styles.statusBlock}>
              <View
                style={[
                  styles.statusChip,
                  settled ? styles.settledChip : styles.debtChip,
                ]}
              >
                <Ionicons
                  name={settled ? "checkmark-circle" : "alert-circle"}
                  size={16}
                  color={settled ? theme.paymentColor : theme.debtColor}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: settled ? theme.paymentColor : theme.debtColor },
                  ]}
                >
                  {settled ? "Qarz yo'q" : "Qarzdor"}
                </Text>
              </View>
              <Text style={styles.statusCaption}>
                {settled ? "Hisob yopilgan" : "Hisob ochiq"}
              </Text>
            </View>
          </View>

          <View style={styles.profileDivider} />

          <View style={styles.statsRow}>
            <DetailStat
              icon="arrow-down"
              label="Jami qarz"
              value={formatCurrency(totalDebt)}
              color={theme.debtColor}
              backgroundColor={theme.debtBg}
            />
            <View style={styles.statDivider} />
            <DetailStat
              icon="arrow-up"
              label="Jami to'lov"
              value={formatCurrency(totalPaid)}
              color={theme.paymentColor}
              backgroundColor={theme.paymentBg}
            />
            <View style={styles.statDivider} />
            <DetailStat
              icon="wallet-outline"
              label="Balans"
              value={formatCurrency(Math.max(balance, 0))}
              color={theme.primary}
              backgroundColor={theme.primaryLight}
            />
          </View>
        </View>

        <View style={styles.primaryActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              openSheet("transaction", {
                customerId,
                type: "debt",
                customerName: getFullName(customer),
                currentBalance: balance,
              })
            }
            style={({ pressed }) => [
              styles.primaryAction,
              styles.debtAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="add-circle-outline"
              size={23}
              color={theme.primary}
            />
            <Text style={[styles.primaryActionText, styles.debtActionText]}>
              Qarz qo'shish
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              openSheet("transaction", {
                customerId,
                type: "payment",
                customerName: getFullName(customer),
                currentBalance: balance,
              })
            }
            style={({ pressed }) => [
              styles.primaryAction,
              styles.paymentAction,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={23}
              color={theme.paymentColor}
            />
            <Text style={[styles.primaryActionText, styles.paymentActionText]}>
              To'lov olish
            </Text>
          </Pressable>
        </View>

        <View style={styles.contactRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCall}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="call" size={20} color={theme.primary} />
            <Text style={styles.contactText}>Qo'ng'iroq</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleWhatsApp}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name="logo-whatsapp"
              size={21}
              color={theme.paymentColor}
            />
            <Text style={styles.contactText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleShare}
            style={({ pressed }) => [
              styles.contactButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="share-social" size={20} color={theme.primary} />
            <Text style={styles.contactText}>Ulashish</Text>
          </Pressable>
        </View>

        <View style={styles.sectionTitleRow}>
          <Ionicons
            name="receipt-outline"
            size={20}
            color={theme.textSecondary}
          />
          <Text style={styles.sectionTitle}>Tranzaksiyalar tarixi</Text>
        </View>

        <View style={styles.filterRow}>
          {[
            { key: "all" as TxDateFilter, label: "Hammasi" },
            { key: "today" as TxDateFilter, label: "Bugun" },
            { key: "7d" as TxDateFilter, label: "7 kun" },
            { key: "30d" as TxDateFilter, label: "30 kun" },
          ].map((item) => {
            const active = txDateFilter === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setTxDateFilter(item.key)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.filterText, active && styles.filterTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filteredTxs.length === 0 ? (
          <EmptyState
            iconName="receipt-outline"
            title="Tranzaksiyalar topilmadi"
            description="Tanlangan sana filtri bo'yicha tranzaksiya yo'q."
          />
        ) : (
          <View style={styles.txCard}>
            {filteredTxs.map((transaction, index) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                isLast={index === filteredTxs.length - 1}
              />
            ))}
          </View>
        )}

        <View style={styles.footerSpace} />
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
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.background,
    },
    notFoundText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    header: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    headerButton: {
      width: 44,
      height: 44,
      borderRadius: 13,
      borderCurve: "continuous",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      boxShadow: theme.cardShadow,
    },
    headerIdentity: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      gap: 2,
    },
    headerTitle: {
      color: theme.text,
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    headerSubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "400",
      fontVariant: ["tabular-nums"],
    },
    scroll: {
      paddingHorizontal: 16,
      paddingTop: 6,
      gap: 12,
    },
    profileCard: {
      padding: 14,
      gap: 14,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 18,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    profileTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.paymentBg,
    },
    avatarText: {
      color: theme.paymentColor,
      fontSize: 23,
      lineHeight: 29,
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    profileIdentity: {
      flex: 1,
      minWidth: 0,
      alignItems: "flex-start",
      gap: 3,
    },
    profileName: {
      color: theme.text,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    profilePhone: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontVariant: ["tabular-nums"],
    },
    idBadge: {
      minHeight: 23,
      justifyContent: "center",
      paddingHorizontal: 8,
      backgroundColor: theme.inputBackground,
      borderRadius: 8,
    },
    idText: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "500",
      fontVariant: ["tabular-nums"],
    },
    statusBlock: {
      maxWidth: 104,
      alignItems: "flex-end",
      gap: 5,
    },
    statusChip: {
      minHeight: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    settledChip: {
      backgroundColor: theme.paymentBg,
      borderColor: theme.paymentColor,
    },
    debtChip: {
      backgroundColor: theme.debtBg,
      borderColor: theme.debtColor,
    },
    statusText: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "700",
    },
    statusCaption: {
      color: theme.textMuted,
      fontSize: 10,
      lineHeight: 14,
      textAlign: "right",
    },
    profileDivider: {
      height: 1,
      backgroundColor: theme.border,
    },
    statsRow: {
      minHeight: 94,
      flexDirection: "row",
      alignItems: "stretch",
    },
    statBox: {
      minWidth: 0,
      flex: 1,
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 5,
      paddingHorizontal: 4,
    },
    statIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    statLabel: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "500",
    },
    statAmount: {
      width: "100%",
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    statDivider: {
      width: 1,
      backgroundColor: theme.border,
      marginHorizontal: 6,
    },
    primaryActions: {
      flexDirection: "row",
      gap: 10,
    },
    primaryAction: {
      minHeight: 52,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 8,
      borderWidth: 1.25,
      borderRadius: 14,
      borderCurve: "continuous",
    },
    debtAction: {
      backgroundColor: theme.primaryLight,
      borderColor: theme.primary,
    },
    paymentAction: {
      backgroundColor: theme.paymentBg,
      borderColor: theme.paymentColor,
    },
    primaryActionText: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
    },
    debtActionText: {
      color: theme.primary,
    },
    paymentActionText: {
      color: theme.paymentColor,
    },
    contactRow: {
      flexDirection: "row",
      gap: 9,
    },
    contactButton: {
      minHeight: 52,
      minWidth: 0,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingHorizontal: 8,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    contactText: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 2,
    },
    sectionTitle: {
      color: theme.text,
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    filterRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    filterChip: {
      minHeight: 38,
      minWidth: 70,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 999,
      backgroundColor: theme.background,
    },
    filterChipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.surface,
    },
    filterText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    filterTextActive: {
      color: theme.primary,
    },
    txCard: {
      overflow: "hidden",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      borderCurve: "continuous",
      boxShadow: theme.cardShadow,
    },
    footerSpace: {
      height: 20,
    },
    pressed: {
      opacity: 0.7,
    },
  });
