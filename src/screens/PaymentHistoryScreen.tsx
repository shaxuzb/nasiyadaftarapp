import React, { useMemo } from "react";
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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBottomSheet } from "../bottom-sheet";
import { useTheme } from "../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  useTranslation,
} from "../i18n";
import { getPaymentCopy } from "../modules/payments/i18n/paymentCopy";
import { usePaymentHistory } from "../modules/payments/hooks/usePaymentQueries";
import type { PaymentOrder } from "../modules/payments/types";
import { spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function PaymentHistoryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { locale, t } = useTranslation();
  const paymentCopy = getPaymentCopy(locale);
  const copy = paymentCopy.history;
  const statusCopy = paymentCopy.order.status;
  const { openSheet } = useBottomSheet();
  const query = usePaymentHistory(30);
  const items = query.data ?? [];
  console.log(query.isError);
  console.log(items);

  const renderItem = ({ item }: { item: PaymentOrder }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.productName}
      onPress={() => openSheet("paymentDetail", { orderId: item.id })}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="card-outline" size={20} color={theme.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {item.productName}
        </Text>
        <Text style={styles.date}>
          {formatLocalizedDate(item.paidDate ?? item.createdDate, locale)}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>
          {formatLocalizedCurrency(item.amount, locale)}
        </Text>
        <Text style={styles.status}>
          {item.status === "paid" && item.isFulfilled
            ? copy.fulfilled
            : statusCopy[item.status]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={theme.textMuted} />
    </Pressable>
  );

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
        <Text style={styles.title}>{copy.title}</Text>
        <View style={styles.back} />
      </View>

      {query.isPending && !items.length ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : query.isError && !items.length ? (
        <View style={styles.center}>
          <Text style={styles.empty}>{copy.error}</Text>
          <Pressable onPress={() => void query.refetch()} style={styles.retry}>
            <Text style={styles.retryText}>{copy.retry}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            !items.length && styles.listEmpty,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>{copy.empty}</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    back: {
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
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    listEmpty: { flexGrow: 1 },
    row: {
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    copy: { minWidth: 0, flex: 1 },
    name: { ...typography.bodyMedium, color: theme.text, fontWeight: "800" },
    date: { ...typography.caption, color: theme.textMuted },
    right: { alignItems: "flex-end" },
    amount: { ...typography.bodySmall, color: theme.text, fontWeight: "800" },
    status: { ...typography.caption, color: theme.primary, fontWeight: "700" },
    separator: { height: 1, backgroundColor: theme.border },
    center: {
      flex: 1,
      minHeight: 240,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.lg,
    },
    empty: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      textAlign: "center",
    },
    retry: {
      minHeight: 42,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: {
      ...typography.bodySmall,
      color: theme.surface,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
  });
