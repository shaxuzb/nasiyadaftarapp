import React, { useEffect, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SheetRenderProps } from "../types";
import type { PendingPaymentReference } from "../../modules/payments/types";
import { useTheme } from "../../hooks/useTheme";
import { formatLocalizedCurrency, useTranslation } from "../../i18n";
import { queryKeys } from "../../core/query/queryKeys";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";
import { getPaymentCopy } from "../../modules/payments/i18n/paymentCopy";
import { usePayment } from "../../modules/payments/hooks/usePaymentQueries";
import { clearPendingPayment } from "../../modules/payments/services/paymentStorage";
import { isPaymentTerminal } from "../../modules/payments/utils/paymentState";

interface PendingPaymentRowProps {
  payment: PendingPaymentReference;
  closeSheet: SheetRenderProps<"pendingPayments">["closeSheet"];
  openSheet: SheetRenderProps<"pendingPayments">["openSheet"];
  copy: ReturnType<typeof getPaymentCopy>["pendingSheet"];
}

function PendingPaymentRow({
  payment,
  closeSheet,
  openSheet,
  copy,
}: PendingPaymentRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale } = useTranslation();
  const queryClient = useQueryClient();
  const orderQuery = usePayment(payment.orderId);
  const order = orderQuery.data;

  useEffect(() => {
    if (!order || !isPaymentTerminal(order)) return;

    void clearPendingPayment(payment.userId, payment.orderId)
      .then(() => {
        queryClient.setQueryData<PendingPaymentReference[]>(
          queryKeys.pendingPayment(payment.userId),
          (current) =>
            current?.filter((item) => item.orderId !== payment.orderId) ?? [],
        );
      })
      .catch(() => undefined);
  }, [order, payment, queryClient]);

  if (order && isPaymentTerminal(order)) return null;

  const productName =
    order?.productName ??
    (payment.productType === "subscription" ? copy.plan : copy.package);
  const amount = order ? formatLocalizedCurrency(order.amount, locale) : null;
  const status =
    order?.status === "paid"
      ? copy.activating
      : order?.status === "holding"
        ? copy.holding
        : copy.pending;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${productName}: ${status}`}
      onPress={() =>
        closeSheet(() =>
          openSheet("paymentStatus", { orderId: payment.orderId }),
        )
      }
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="time-outline" size={20} color={theme.primary} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {productName}
        </Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {amount ? `${amount} · ` : ""}
          {status}
        </Text>
      </View>
      {orderQuery.isPending ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.textMuted} />
      )}
    </Pressable>
  );
}

export function PendingPaymentsSheet({
  props,
  closeSheet,
  openSheet,
}: SheetRenderProps<"pendingPayments">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { locale } = useTranslation();
  const copy = getPaymentCopy(locale).pendingSheet;

  return (
    <BottomSheetScrollView
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xl),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.headerIcon}>
            <Ionicons name="time-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.titleCopy}>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.description}>{copy.description}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.close}
          onPress={() => closeSheet()}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="close" size={23} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{props.payments.length}</Text>
        <Text style={styles.countLabel}>{copy.title}</Text>
      </View>

      <View style={styles.list}>
        {props.payments.length > 0 ? (
          props.payments.map((payment) => (
            <PendingPaymentRow
              key={payment.orderId}
              payment={payment}
              closeSheet={closeSheet}
              openSheet={openSheet}
              copy={copy}
            />
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="checkmark-circle-outline"
              size={28}
              color={theme.successColor}
            />
            <Text style={styles.emptyText}>{copy.empty}</Text>
          </View>
        )}
      </View>
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.md,
      backgroundColor: theme.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    headerIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },
    titleCopy: { flex: 1, gap: 2 },
    title: { ...typography.headingMedium, color: theme.text },
    description: { ...typography.caption, color: theme.textSecondary },
    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    countBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: 9,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    countText: {
      ...typography.bodyMedium,
      color: theme.primary,
      fontWeight: "800",
    },
    countLabel: { ...typography.caption, color: theme.textSecondary },
    list: { gap: spacing.xs },
    row: {
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    rowIcon: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
    rowCopy: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "800",
    },
    rowSubtitle: { ...typography.caption, color: theme.textSecondary },
    empty: {
      minHeight: 88,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
    },
    emptyText: { ...typography.bodySmall, color: theme.textSecondary },
    pressed: { opacity: 0.72 },
  });
