import React, { memo, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { useTheme } from "../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDateTime,
  getLocalizedApiErrorMessage,
  useTranslation,
} from "../i18n";
import { formatDateOnly } from "../i18n/calendarLabels";
import { useMoney } from "../modules/currency/hooks/useMoney";
import { useDeletedClient } from "../modules/history/hooks/useHistory";
import type { DeletedClientTransaction } from "../modules/history/utils/historyParsing";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getInitials } from "../utils";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Styles = ReturnType<typeof createStyles>;

/**
 * A deleted customer, as they were when deleted: who they were, what they
 * owed, and every debt and payment. Nothing here can be changed or restored.
 */
export function DeletedClientScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, "DeletedClient">>();
  const insets = useSafeAreaInsets();
  const { locale, t } = useTranslation();
  const money = useMoney();
  const query = useDeletedClient(route.params.clientId);
  const detail = query.data;
  const client = detail?.client;

  const format = useCallback(
    (amount: number) =>
      client?.currencyCode
        ? formatLocalizedCurrency(amount, locale, client.currencyCode)
        : money.format(amount),
    [client?.currencyCode, locale, money],
  );
  const renderItem = useCallback(
    ({ item }: { item: DeletedClientTransaction }) => (
      <TransactionRow tx={item} format={format} styles={styles} theme={theme} />
    ),
    [format, styles, theme],
  );

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        onPress={() => navigation.goBack()}
        style={styles.back}
      >
        <Ionicons name="arrow-back" size={23} color={theme.text} />
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {t("history.deletedTitle")}
      </Text>
      <View style={styles.back} />
    </View>
  );

  if (!client) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {header}
        <View style={styles.center}>
          {query.isError ? (
            <>
              <Text style={styles.message}>
                {getLocalizedApiErrorMessage(query.error, "history.loadError", t)}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void query.refetch()}
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
              >
                <Text style={styles.retryText}>{t("common.retry")}</Text>
              </Pressable>
            </>
          ) : (
            <ActivityIndicator color={theme.primary} />
          )}
        </View>
      </SafeAreaView>
    );
  }

  const name = client.fullName || client.phoneNumber || t("transactions.customerFallback");
  const initials = getInitials({ id: client.id, fullName: name, phone: client.phoneNumber });
  const facts: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    {
      icon: "trash-outline",
      label: t("history.deletedOnLabel"),
      value: client.deletedDate
        ? formatLocalizedDateTime(client.deletedDate, locale)
        : t("history.dateUnknown"),
    },
    ...(client.deletedByUserName
      ? [{ icon: "person-outline" as const, label: t("history.deletedBy"), value: client.deletedByUserName }]
      : []),
    ...(client.createdDate
      ? [{ icon: "calendar-outline" as const, label: t("history.createdOn"), value: formatLocalizedDateTime(client.createdDate, locale) }]
      : []),
    ...(client.note.trim()
      ? [{ icon: "document-text-outline" as const, label: t("transactions.note"), value: client.note.trim() }]
      : []),
  ];

  const top = (
    <View style={styles.top}>
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
        <Text style={styles.noticeText}>{t("history.readOnlyNote")}</Text>
      </View>

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <View style={styles.profileCopy}>
          <Text style={styles.name} numberOfLines={2}>
            {name}
          </Text>
          {client.phoneNumber && client.fullName ? (
            <Text style={styles.phone}>{client.phoneNumber}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t("history.balanceAtDeletion")}</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: client.currentBalance > 0 ? theme.debtColor : theme.paymentColor },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {format(client.currentBalance)}
        </Text>
        <View style={styles.totals}>
          <View style={styles.total}>
            <Text style={styles.totalLabel}>{t("transactions.totalDebt")}</Text>
            <Text style={[styles.totalValue, { color: theme.debtColor }]} numberOfLines={1}>
              {format(detail.totalDebt)}
            </Text>
          </View>
          <View style={styles.totalDivider} />
          <View style={styles.total}>
            <Text style={styles.totalLabel}>{t("transactions.totalPayment")}</Text>
            <Text style={[styles.totalValue, { color: theme.paymentColor }]} numberOfLines={1}>
              {format(detail.totalPayment)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.facts}>
        {facts.map((fact, index) => (
          <View key={fact.label} style={[styles.fact, index > 0 && styles.factBorder]}>
            <Ionicons name={fact.icon} size={18} color={theme.textMuted} />
            <Text style={styles.factLabel}>{fact.label}</Text>
            <Text style={styles.factValue} numberOfLines={3}>
              {fact.value}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.section}>
        {t("history.transactions", { count: detail.transactions.length })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {header}
      <FlatList
        data={detail.transactions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={top}
        ListEmptyComponent={
          <EmptyState iconName="receipt-outline" title={t("history.noTransactions")} />
        }
        contentContainerStyle={[styles.list, { paddingBottom: spacing.xl + insets.bottom }]}
        initialNumToRender={14}
        windowSize={7}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const TransactionRow = memo(function TransactionRow({
  tx,
  format,
  styles,
  theme,
}: {
  tx: DeletedClientTransaction;
  format: (amount: number) => string;
  styles: Styles;
  theme: AppTheme;
}) {
  const { locale, t } = useTranslation();
  const isDebt = tx.type === "debt";
  const date = tx.date ? formatLocalizedDateTime(tx.date, locale) : "";
  return (
    <View style={styles.txRow}>
      <View style={styles.txCopy}>
        <Text style={styles.txDate}>{date}</Text>
        <Text style={styles.txNote} numberOfLines={3}>
          {tx.note || (isDebt ? t("transactions.detailDebt") : t("transactions.detailPayment"))}
        </Text>
        {tx.dueDate ? (
          <Text style={styles.txDue} numberOfLines={1}>
            {t("transactions.dueOn", { date: formatDateOnly(tx.dueDate, t) })}
          </Text>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        style={[styles.txAmount, { color: isDebt ? theme.debtColor : theme.paymentColor }]}
      >
        {isDebt ? "−" : "+"}
        {format(tx.amount)}
      </Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { flex: 1, textAlign: "center", ...typography.headingLarge, color: theme.text },
    list: { paddingHorizontal: spacing.md },
    top: { gap: spacing.md, paddingBottom: spacing.sm },
    notice: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    noticeText: { flex: 1, color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    profile: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    initials: { color: theme.textMuted, fontWeight: "800", fontSize: 19 },
    profileCopy: { flex: 1, minWidth: 0, gap: 2 },
    name: { color: theme.text, fontSize: 18, lineHeight: 24, fontWeight: "800" },
    phone: { color: theme.textSecondary, fontSize: 14 },
    balanceCard: {
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      gap: 4,
    },
    balanceLabel: { color: theme.textSecondary, fontSize: 13, fontWeight: "600" },
    balanceValue: { fontSize: 24, fontWeight: "800" },
    totals: {
      flexDirection: "row",
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    total: { flex: 1, gap: 2 },
    totalDivider: { width: 1, marginHorizontal: spacing.sm, backgroundColor: theme.border },
    totalLabel: { color: theme.textMuted, fontSize: 12 },
    totalValue: { fontSize: 14, fontWeight: "800" },
    facts: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      paddingHorizontal: spacing.md,
    },
    fact: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    factBorder: { borderTopWidth: 1, borderTopColor: theme.border },
    factLabel: { color: theme.textSecondary, fontSize: 13 },
    factValue: {
      flex: 1,
      textAlign: "right",
      color: theme.text,
      fontSize: 13,
      fontWeight: "700",
    },
    section: {
      marginTop: spacing.sm,
      color: theme.text,
      fontSize: 15,
      fontWeight: "800",
    },
    txRow: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    txCopy: { flex: 1, minWidth: 0, gap: 2 },
    txDate: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },
    txNote: { color: theme.text, fontSize: 14, lineHeight: 19 },
    txDue: { color: theme.textMuted, fontSize: 12, fontWeight: "600" },
    txAmount: { fontSize: 15, fontWeight: "800", maxWidth: "45%" },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.lg,
    },
    message: { ...typography.bodyMedium, color: theme.textSecondary, textAlign: "center" },
    retry: {
      minHeight: 42,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: { ...typography.bodySmall, color: theme.surface, fontWeight: "800" },
    pressed: { opacity: 0.72 },
  });
