import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { type RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { useRegionalProductCapabilities } from "../hooks/useRegionalProductCapabilities";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../i18n";
import { formatDateOnly, formatRelativeDateOnly } from "../i18n/calendarLabels";
import { getClientSmsCapabilities } from "../modules/client-sms/utils/smsPermissions";
import { useMoney } from "../modules/currency/hooks/useMoney";
import { useDueClients } from "../modules/debt-due/hooks/useDueClients";
import type { DueClient } from "../modules/debt-due/utils/dueClients";
import { readDay } from "../modules/debt-due/utils/dueClients";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getInitials } from "../utils";
import { todayDateOnly } from "../utils/dateOnly";
import { hapticTap } from "../utils/haptics";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

/**
 * Customers whose debt was to be paid back on a day (today unless the push
 * named one), who still owe. All are ticked at first: the usual next step is
 * a reminder to every one of them, one tap away.
 */
export function DueClientsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const route = useRoute<RouteProp<RootStackParamList, "DueClients">>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const money = useMoney();
  const { user } = useAuth();
  const regional = useRegionalProductCapabilities();
  const sms = getClientSmsCapabilities(user?.permissions, user?.subscription);
  const canRemind = regional.clientSmsVisible && sms.canView && sms.canSendBulk;

  const today = todayDateOnly();
  const date = readDay(route.params?.date) ?? today;
  const query = useDueClients(date);
  const clients = query.clients;

  const [selected, setSelected] = useState<Set<number>>(new Set());
  // Ticks everyone the first time the list arrives; after that the user's
  // choice stands, a refresh only drops those no longer in the list.
  const seeded = useRef(false);
  useEffect(() => {
    if (!query.data) return;
    const ids = clients.map((client) => client.clientId);
    if (!seeded.current) {
      seeded.current = true;
      setSelected(new Set(ids));
      return;
    }
    const present = new Set(ids);
    setSelected((current) => {
      const next = new Set([...current].filter((id) => present.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [clients, query.data]);

  const total = useMemo(
    () => clients.reduce((sum, client) => sum + client.dueAmount, 0),
    [clients],
  );
  const allSelected = clients.length > 0 && selected.size === clients.length;

  const toggle = useCallback((id: number) => {
    void hapticTap();
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const openCustomer = useCallback(
    (id: number) => navigation.navigate("CustomerDetail", { customerId: id }),
    [navigation],
  );
  const sendReminders = useCallback(() => {
    if (!selected.size) return;
    navigation.navigate("ClientSms", { preselectedIds: [...selected] });
  }, [navigation, selected]);

  const renderItem = useCallback(
    ({ item }: { item: DueClient }) => (
      <DueClientRow
        client={item}
        date={date}
        selectable={canRemind}
        selected={selected.has(item.clientId)}
        onToggle={toggle}
        onOpen={openCustomer}
        styles={styles}
        theme={theme}
      />
    ),
    [canRemind, date, openCustomer, selected, styles, theme, toggle],
  );

  const dayLabel = formatRelativeDateOnly(date, today, t);
  const showFooter = canRemind && clients.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
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
          {t("dueClients.title")}
        </Text>
        <View style={styles.back} />
      </View>

      {query.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : query.isError && !query.data ? (
        <View style={styles.center}>
          <Text style={styles.message}>{t("dueClients.loadError")}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void query.refetch()}
            style={styles.retry}
          >
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => String(item.clientId)}
          renderItem={renderItem}
          extraData={selected}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: (showFooter ? 96 : spacing.xl) + insets.bottom },
            !clients.length && styles.listEmpty,
          ]}
          ListHeaderComponent={
            clients.length ? (
              <View style={styles.summary}>
                <View style={styles.summaryIcon}>
                  <Ionicons name="alarm-outline" size={22} color={theme.dangerColor} />
                </View>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summaryDay}>{dayLabel}</Text>
                  <Text style={styles.summaryText}>
                    {t("dueClients.summary", { count: clients.length })}
                  </Text>
                </View>
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>{t("dueClients.total")}</Text>
                  <Text style={styles.summaryTotalValue} numberOfLines={1} adjustsFontSizeToFit>
                    {money.format(total)}
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              iconName="checkmark-done-circle-outline"
              title={t("dueClients.emptyTitle", { day: dayLabel })}
              description={t("dueClients.emptyDescription")}
            />
          }
          ItemSeparatorComponent={Separator}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          initialNumToRender={12}
          windowSize={7}
          showsVerticalScrollIndicator={false}
        />
      )}

      {showFooter ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setSelected(
                allSelected ? new Set() : new Set(clients.map((client) => client.clientId)),
              )
            }
            hitSlop={8}
            style={({ pressed }) => [styles.selectAll, pressed && styles.pressed]}
          >
            <Text style={styles.selectAllText}>
              {allSelected ? t("sms.cancelSelection") : t("sms.selectAll")}
            </Text>
          </Pressable>
          <PrimaryButton
            label={t("dueClients.sendSms", { count: selected.size })}
            onPress={sendReminders}
            disabled={!selected.size}
            style={styles.send}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={{ height: spacing.sm }} />;
}

const DueClientRow = memo(function DueClientRow({
  client,
  date,
  selectable,
  selected,
  onToggle,
  onOpen,
  styles,
  theme,
}: {
  client: DueClient;
  date: string;
  selectable: boolean;
  selected: boolean;
  onToggle: (id: number) => void;
  onOpen: (id: number) => void;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  const { t } = useTranslation();
  const money = useMoney();
  const name = client.fullName || client.phoneNumber || t("transactions.customerFallback");
  const initials = getInitials({ id: client.clientId, fullName: name, phone: client.phoneNumber });
  // An older debt still unpaid shows its own day; one due on the day shown
  // needs no date repeated on every row.
  const earlier = client.dueDate && client.dueDate < date;
  const showTotal = client.currentBalance > client.dueAmount;

  return (
    <Pressable
      accessibilityRole={selectable ? "checkbox" : "button"}
      accessibilityState={selectable ? { checked: selected } : undefined}
      accessibilityLabel={`${name}, ${money.format(client.dueAmount)}`}
      onPress={() => (selectable ? onToggle(client.clientId) : onOpen(client.clientId))}
      style={({ pressed }) => [
        styles.card,
        selectable && selected && styles.cardSelected,
        pressed && styles.pressed,
      ]}
    >
      {selectable ? (
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
        </View>
      ) : null}
      <View style={styles.avatar}>
        <Text style={styles.initials}>{initials}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {client.phoneNumber ? (
          <Text style={styles.phone} numberOfLines={1}>
            {client.phoneNumber}
          </Text>
        ) : null}
        {earlier ? (
          <Text style={styles.late} numberOfLines={1}>
            {t("transactions.dueOn", { date: formatDateOnly(client.dueDate, t) })}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        <Text style={styles.amount} numberOfLines={1}>
          {money.format(client.dueAmount)}
        </Text>
        {showTotal ? (
          <Text style={styles.totalDebt} numberOfLines={1}>
            {t("dueClients.totalDebt", { amount: money.format(client.currentBalance) })}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("dueClients.openCustomer", { name })}
        onPress={() => onOpen(client.clientId)}
        hitSlop={8}
        style={({ pressed }) => [styles.open, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      </Pressable>
    </Pressable>
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
    list: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
    listEmpty: { flexGrow: 1, justifyContent: "center" },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    summaryIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    summaryCopy: { flex: 1, minWidth: 0 },
    summaryDay: { ...typography.bodyMedium, color: theme.text, fontWeight: "800" },
    summaryText: { ...typography.caption, color: theme.textSecondary },
    summaryTotal: { alignItems: "flex-end", maxWidth: "45%" },
    summaryTotalLabel: { ...typography.caption, color: theme.textMuted },
    summaryTotalValue: { fontSize: 16, fontWeight: "800", color: theme.debtColor },
    card: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.md,
      paddingRight: spacing.xs,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    cardSelected: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    check: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: theme.textMuted,
      alignItems: "center",
      justifyContent: "center",
    },
    checkSelected: { borderColor: theme.primary, backgroundColor: theme.primary },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    initials: { color: theme.primary, fontWeight: "800", fontSize: 15 },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    name: { color: theme.text, fontSize: 14, fontWeight: "700" },
    phone: { color: theme.textSecondary, fontSize: 12 },
    late: { color: theme.dangerColor, fontSize: 12, fontWeight: "700" },
    trailing: { alignItems: "flex-end", maxWidth: "40%" },
    amount: { color: theme.debtColor, fontSize: 15, fontWeight: "800" },
    totalDebt: { color: theme.textMuted, fontSize: 11, marginTop: 2 },
    open: { width: 32, height: 44, alignItems: "center", justifyContent: "center" },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingTop: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    selectAll: { minHeight: 44, justifyContent: "center" },
    selectAllText: { ...typography.bodySmall, color: theme.primary, fontWeight: "700" },
    send: { flex: 1 },
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
