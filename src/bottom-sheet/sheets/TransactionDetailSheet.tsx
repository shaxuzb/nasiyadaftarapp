import React, { useMemo } from "react";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SheetRenderProps } from "../types";
import { AppTheme } from "../../types";
import { useTheme } from "../../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  useTranslation,
} from "../../i18n";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface DetailRowProps {
  icon: IconName;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={17} color={theme.textSecondary} />
      </View>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function TransactionDetailSheet({
  props,
  closeSheet,
}: SheetRenderProps<"transactionDetail">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const { transaction } = props;
  const isDebt = transaction.type === "debt";
  const accentColor = isDebt ? theme.debtColor : theme.paymentColor;
  const accentBackground = isDebt ? theme.debtBg : theme.paymentBg;
  const title = isDebt
    ? t("transactions.detailDebt")
    : t("transactions.detailPayment");
  const note =
    transaction.note?.trim() ||
    (isDebt ? t("transactions.noteEmptyDebt") : t("transactions.noteEmptyPayment"));

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View
          style={[styles.headerIcon, { backgroundColor: accentBackground }]}
        >
          <Ionicons
            name={isDebt ? "arrow-down" : "arrow-up"}
            size={23}
            color={accentColor}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text selectable style={styles.customerName} numberOfLines={1}>
          {props.customerName}
        </Text>
      </View>

      <View
        style={[
          styles.amountCard,
          { backgroundColor: accentBackground, borderColor: accentColor },
        ]}
      >
        <Text style={styles.amountLabel}>
          {isDebt ? t("transactions.debtAmount") : t("transactions.paymentAmount")}
        </Text>
        <Text selectable style={[styles.amount, { color: accentColor }]}>
          {isDebt ? "−" : "+"} {formatLocalizedCurrency(transaction.amount, locale)}
        </Text>
        <Text selectable style={styles.amountDate}>
          {formatLocalizedDate(transaction.date, locale)}
        </Text>
      </View>

      <View style={styles.detailsCard}>
        <DetailRow
          icon="person-outline"
          label={t("transactions.customer")}
          value={props.customerName}
        />
        <View style={styles.rowDivider} />
        <DetailRow
          icon="swap-vertical-outline"
          label={t("transactions.type")}
          value={isDebt ? t("common.debt") : t("common.payment")}
        />
        <View style={styles.rowDivider} />
        <DetailRow
          icon="calendar-outline"
          label={t("transactions.date")}
          value={formatLocalizedDate(transaction.date, locale)}
        />
        <View style={styles.rowDivider} />
        <DetailRow icon="document-text-outline" label={t("transactions.note")} value={note} />
        <View style={styles.rowDivider} />
        <DetailRow
          icon="key-outline"
          label={t("transactions.transactionId")}
          value={String(transaction.id)}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("transactions.close")}
        onPress={() => closeSheet()}
        style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
      >
        <Text style={styles.closeButtonText}>{t("transactions.close")}</Text>
      </Pressable>
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 28,
      gap: 14,
      backgroundColor: theme.surface,
    },
    header: {
      alignItems: "center",
      gap: 3,
      paddingBottom: 2,
    },
    headerIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 3,
    },
    title: {
      color: theme.text,
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    customerName: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
    },
    amountCard: {
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderWidth: 1,
      borderRadius: 16,
      borderCurve: "continuous",
    },
    amountLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    amount: {
      marginTop: 2,
      fontSize: 25,
      lineHeight: 32,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    amountDate: {
      marginTop: 2,
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 15,
    },
    detailsCard: {
      paddingHorizontal: 13,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      borderCurve: "continuous",
    },
    detailRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },
    detailIcon: {
      width: 30,
      height: 30,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      backgroundColor: theme.inputBackground,
    },
    detailLabel: {
      width: 105,
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500",
    },
    detailValue: {
      minWidth: 0,
      flex: 1,
      color: theme.text,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      textAlign: "right",
    },
    rowDivider: {
      height: 1,
      backgroundColor: theme.border,
    },
    closeButton: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      borderCurve: "continuous",
    },
    closeButtonText: {
      color: theme.text,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
    },
    pressed: {
      opacity: 0.7,
    },
  });
