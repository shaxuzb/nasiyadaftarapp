import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  useTranslation,
} from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import type { PaymentOrder } from "../types";

type Copy = {
  status: Record<PaymentOrder["status"], string>;
  fulfilled: string;
  provider: string;
  account: string;
  created: string;
  paid: string;
  fulfilledAt: string;
  orderId: string;
};

const COPY: Record<"uz" | "ru", Copy> = {
  uz: {
    status: {
      pending: "To‘lov kutilmoqda",
      paid: "To‘lov qabul qilindi",
      cancelled: "To‘lov bekor qilindi",
      failed: "To‘lov amalga oshmadi",
      expired: "To‘lov muddati tugadi",
    },
    fulfilled: "Xizmat faollashtirildi",
    provider: "Provayder",
    account: "Hisob raqami",
    created: "Yaratilgan",
    paid: "To‘langan",
    fulfilledAt: "Faollashtirilgan",
    orderId: "Buyurtma ID",
  },
  ru: {
    status: {
      pending: "Ожидание оплаты",
      paid: "Оплата получена",
      cancelled: "Оплата отменена",
      failed: "Оплата не выполнена",
      expired: "Срок оплаты истёк",
    },
    fulfilled: "Услуга активирована",
    provider: "Провайдер",
    account: "Номер счёта",
    created: "Создано",
    paid: "Оплачено",
    fulfilledAt: "Активировано",
    orderId: "ID заказа",
  },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text selectable style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function PaymentOrderContent({ order }: { order: PaymentOrder }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale } = useTranslation();
  const copy = COPY[locale === "ru" ? "ru" : "uz"];
  const successful = order.status === "paid" && order.isFulfilled;
  const accent = successful
    ? theme.successColor
    : order.status === "failed" || order.status === "expired"
      ? theme.dangerColor
      : order.status === "cancelled"
        ? theme.textMuted
        : theme.primary;

  return (
    <>
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: `${accent}18` }]}>
          <Ionicons
            name={successful ? "checkmark-circle" : "card-outline"}
            size={28}
            color={accent}
          />
        </View>
        <Text style={styles.productName}>{order.productName}</Text>
        <Text style={[styles.amount, { color: accent }]}>
          {formatLocalizedCurrency(order.amount, locale)}
        </Text>
        <Text style={[styles.status, { color: accent }]}>
          {successful ? copy.fulfilled : copy.status[order.status]}
        </Text>
      </View>

      <View style={styles.details}>
        <DetailRow label={copy.orderId} value={String(order.id)} />
        {order.provider ? <DetailRow label={copy.provider} value={order.provider} /> : null}
        {order.accountNumber ? (
          <DetailRow label={copy.account} value={order.accountNumber} />
        ) : null}
        <DetailRow
          label={copy.created}
          value={formatLocalizedDate(order.createdDate, locale)}
        />
        {order.paidDate ? (
          <DetailRow
            label={copy.paid}
            value={formatLocalizedDate(order.paidDate, locale)}
          />
        ) : null}
        {order.fulfilledDate ? (
          <DetailRow
            label={copy.fulfilledAt}
            value={formatLocalizedDate(order.fulfilledDate, locale)}
          />
        ) : null}
      </View>
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    hero: {
      alignItems: "center",
      gap: 5,
      paddingVertical: spacing.sm,
    },
    icon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 3,
    },
    productName: {
      ...typography.headingMedium,
      color: theme.text,
      textAlign: "center",
    },
    amount: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    status: {
      ...typography.bodySmall,
      fontWeight: "700",
      textAlign: "center",
    },
    details: {
      paddingHorizontal: spacing.md,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.lg,
    },
    row: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    rowLabel: {
      ...typography.caption,
      color: theme.textSecondary,
    },
    rowValue: {
      flex: 1,
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: "700",
      textAlign: "right",
    },
  });
