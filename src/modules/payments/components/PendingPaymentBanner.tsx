import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";

import { useBottomSheet } from "../../../bottom-sheet";
import { useTheme } from "../../../hooks/useTheme";
import { formatLocalizedCurrency, useTranslation } from "../../../i18n";
import { queryKeys } from "../../../core/query/queryKeys";
import type { AppTheme } from "../../../types";
import { getPaymentCopy } from "../i18n/paymentCopy";
import { usePendingPayments, usePayment } from "../hooks/usePaymentQueries";
import { clearPendingPayment } from "../services/paymentStorage";
import { isPaymentTerminal } from "../utils/paymentState";

export function PendingPaymentBanner() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale } = useTranslation();
  const copy = getPaymentCopy(locale).pendingBanner;
  const { openSheet } = useBottomSheet();
  const queryClient = useQueryClient();
  const pendingQuery = usePendingPayments();
  const pendingPayments = pendingQuery.data ?? [];
  const latestPending = pendingPayments[0];
  const orderQuery = usePayment(latestPending?.orderId ?? 0);
  const order = orderQuery.data;

  useEffect(() => {
    if (!latestPending || !order || !isPaymentTerminal(order)) return;

    void clearPendingPayment(latestPending.userId, latestPending.orderId)
      .then(() => {
        queryClient.setQueryData(
          queryKeys.pendingPayment(latestPending.userId),
          (current: typeof pendingPayments) =>
            current?.filter((item) => item.orderId !== latestPending.orderId) ?? [],
        );
      })
      .catch(() => undefined);
  }, [latestPending, order, pendingPayments, queryClient]);

  if (!latestPending || (order && isPaymentTerminal(order))) return null;

  const productName =
    order?.productName ??
    (latestPending.productType === "subscription" ? copy.plan : copy.package);
  const amount = order ? formatLocalizedCurrency(order.amount, locale) : null;
  const multiple = pendingPayments.length > 1;
  const title = multiple
    ? copy.multiple.replace("{count}", String(pendingPayments.length))
    : copy.title;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${productName}`}
      onPress={() => {
        if (multiple) {
          openSheet("pendingPayments", { payments: pendingPayments });
          return;
        }
        openSheet("paymentStatus", { orderId: latestPending.orderId });
      }}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Ionicons name="time-outline" size={19} color={theme.primary} />
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {multiple ? copy.select : `${productName}${amount ? ` · ${amount}` : ""}`}
        </Text>
      </View>
      <View style={styles.actionWrap}>
        <Text style={styles.action}>{copy.action}</Text>
        <Ionicons name="chevron-forward" size={17} color={theme.primary} />
      </View>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    banner: {
      minHeight: 58,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 8,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    icon: {
      width: 36,
      height: 36,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.surface,
    },
    copyWrap: {
      minWidth: 0,
      flex: 1,
      gap: 1,
    },
    title: {
      color: theme.text,
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "800",
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
    },
    actionWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
    },
    action: {
      color: theme.primary,
      fontSize: 10,
      lineHeight: 14,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
  });
