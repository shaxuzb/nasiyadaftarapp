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
import {
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";

import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { TransactionItem } from "../modules/transactions/components/TransactionItem";
import { EmptyState } from "../components/EmptyState";
import {
  formatCurrency,
  formatDate,
  getFullName,
  getInitials,
} from "../utils";
import { APP_NAME } from "../constants";
import { RootStackParamList } from "../types";
import { useBottomSheet } from "../bottom-sheet";

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
    } catch {
      showToast("Mijozni o'chirishda xatolik", "error");
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
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color="#071426" />
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
          <Ionicons name="trash-outline" size={22} color="#DC2626" />
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
                  color={settled ? "#159447" : "#F4511E"}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: settled ? "#159447" : "#F4511E" },
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
              color="#F4511E"
              backgroundColor="#FFF0E8"
            />
            <View style={styles.statDivider} />
            <DetailStat
              icon="arrow-up"
              label="Jami to'lov"
              value={formatCurrency(totalPaid)}
              color="#159447"
              backgroundColor="#E7F8ED"
            />
            <View style={styles.statDivider} />
            <DetailStat
              icon="wallet-outline"
              label="Balans"
              value={formatCurrency(Math.max(balance, 0))}
              color="#0B5DEB"
              backgroundColor="#E7F0FF"
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
            <Ionicons name="add-circle-outline" size={23} color="#0B5DEB" />
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
            <Ionicons name="wallet-outline" size={23} color="#159447" />
            <Text style={[styles.primaryActionText, styles.paymentActionText]}>
              To'lov olish
            </Text>
          </Pressable>
        </View>

        <View style={styles.contactRow}>
          <Pressable
            accessibilityRole="button"
            onPress={handleCall}
            style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
          >
            <Ionicons name="call" size={20} color="#0B5DEB" />
            <Text style={styles.contactText}>Qo'ng'iroq</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleWhatsApp}
            style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
          >
            <Ionicons name="logo-whatsapp" size={21} color="#159447" />
            <Text style={styles.contactText}>WhatsApp</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={handleShare}
            style={({ pressed }) => [styles.contactButton, pressed && styles.pressed]}
          >
            <Ionicons name="share-social" size={20} color="#0B5DEB" />
            <Text style={styles.contactText}>Ulashish</Text>
          </Pressable>
        </View>

        <View style={styles.sectionTitleRow}>
          <Ionicons name="receipt-outline" size={20} color="#173766" />
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
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
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

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7F9FC",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9FC",
  },
  notFoundText: {
    color: "#071426",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DEE6F0",
    boxShadow: "0 5px 16px rgba(24, 48, 80, 0.08)",
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 2,
  },
  headerTitle: {
    color: "#071426",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: "#5D6F8C",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E9F2",
    borderRadius: 18,
    borderCurve: "continuous",
    boxShadow: "0 8px 24px rgba(24, 48, 80, 0.08)",
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
    backgroundColor: "#E4F6EA",
  },
  avatarText: {
    color: "#138A3D",
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
    color: "#071426",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  profilePhone: {
    color: "#5A6E8E",
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ["tabular-nums"],
  },
  idBadge: {
    minHeight: 23,
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "#F1F5FA",
    borderRadius: 8,
  },
  idText: {
    color: "#4F6382",
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
    backgroundColor: "#F0FBF4",
    borderColor: "#A9E1BD",
  },
  debtChip: {
    backgroundColor: "#FFF6F1",
    borderColor: "#FFC9AD",
  },
  statusText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
  },
  statusCaption: {
    color: "#617390",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "right",
  },
  profileDivider: {
    height: 1,
    backgroundColor: "#E1E8F1",
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
    color: "#5A6D8A",
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
    backgroundColor: "#DDE5EF",
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
    backgroundColor: "#F8FBFF",
    borderColor: "#8AB7FF",
  },
  paymentAction: {
    backgroundColor: "#F3FBF6",
    borderColor: "#A5DEB9",
  },
  primaryActionText: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },
  debtActionText: {
    color: "#0B5DEB",
  },
  paymentActionText: {
    color: "#159447",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DFE7F1",
    borderRadius: 14,
    borderCurve: "continuous",
    boxShadow: "0 5px 16px rgba(24, 48, 80, 0.06)",
  },
  contactText: {
    color: "#465C7D",
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
    color: "#10284B",
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
    borderColor: "#DDE5EF",
    borderRadius: 999,
    backgroundColor: "#F7F9FC",
  },
  filterChipActive: {
    borderColor: "#0B5DEB",
    backgroundColor: "#FFFFFF",
  },
  filterText: {
    color: "#536987",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  filterTextActive: {
    color: "#0B5DEB",
  },
  txCard: {
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E9F2",
    borderRadius: 16,
    borderCurve: "continuous",
    boxShadow: "0 7px 22px rgba(24, 48, 80, 0.07)",
  },
  footerSpace: {
    height: 20,
  },
  pressed: {
    opacity: 0.7,
  },
});
