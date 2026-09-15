import React, { useMemo, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import type { SheetRenderProps } from "../types";
import { useBottomSheet } from "../useBottomSheet";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../hooks/useTheme";
import { formatLocalizedCurrency, useTranslation } from "../../i18n";
import { getPaymentCopy } from "../../modules/payments/i18n/paymentCopy";
import { usePaymentCheckout } from "../../modules/payments/hooks/usePaymentCheckout";
import { isPaymentFulfilled } from "../../modules/payments/utils/paymentState";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (token, key) =>
    values[key] === undefined ? token : String(values[key]),
  );
}

export function PaymentCheckoutSheet({
  props,
  closeSheet,
  setDismissLocked,
}: SheetRenderProps<"paymentCheckout">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale } = useTranslation();
  const copy = getPaymentCopy(locale).checkout;
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const { startCheckout, isCreating } = usePaymentCheckout();
  const submittingRef = useRef(false);

  const isPlan = props.productType === "subscription";
  const product = isPlan ? props.plan : props.package;
  const amount = product.price;
  const title = isPlan ? copy.planTitle : copy.packageTitle;
  const primaryLabel =
    amount === 0 && isPlan
      ? copy.activate
      : isPlan
        ? fill(copy.pay, { amount: formatLocalizedCurrency(amount, locale) })
        : copy.buyPackage;

  const details = isPlan
    ? [
        props.plan.monthlySmsLimit === null
          ? null
          : fill(copy.monthlySms, { count: props.plan.monthlySmsLimit }),
        props.plan.maxOrganizations === null
          ? copy.unlimitedOrganizations
          : fill(copy.organizations, { count: props.plan.maxOrganizations }),
      ].filter((value): value is string => Boolean(value))
    : [fill(copy.smsCount, { count: props.package.smsCount })];

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setDismissLocked(true);
    try {
      const result = await startCheckout({
        productType: props.productType,
        productId: product.id,
      });
      setDismissLocked(false);
      closeSheet(() => {
        openSheet("paymentStatus", {
          orderId: result.order.id,
          openCheckoutOnMount:
            Boolean(result.checkoutUrl) && !isPaymentFulfilled(result.order),
        });
      });
    } catch {
      setDismissLocked(false);
      submittingRef.current = false;
      showToast(copy.error, "error");
    }
  };

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons
            name={isPlan ? "sparkles-outline" : "chatbubble-ellipses-outline"}
            size={24}
            color={theme.primary}
          />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.productName}>{product.name}</Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.price}>
          {formatLocalizedCurrency(amount, locale)}
        </Text>
        <Text style={styles.hint}>{amount === 0 ? copy.freeHint : copy.externalHint}</Text>
      </View>

      <View style={styles.detailsCard}>
        {details.map((detail) => (
          <View key={detail} style={styles.detailRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.successColor} />
            <Text style={styles.detailText}>{detail}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isCreating, busy: isCreating }}
        disabled={isCreating}
        onPress={() => void handleConfirm()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          isCreating && styles.disabled,
        ]}
      >
        {isCreating ? <ActivityIndicator size="small" color={theme.surface} /> : null}
        <Text style={styles.primaryText}>{primaryLabel}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isCreating}
        onPress={() => closeSheet()}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
          isCreating && styles.disabled,
        ]}
      >
        <Text style={styles.secondaryText}>{copy.cancel}</Text>
      </Pressable>
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xl,
      gap: spacing.md,
      backgroundColor: theme.surface,
    },
    header: { alignItems: "center", gap: 4 },
    icon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
      marginBottom: 2,
    },
    title: { ...typography.headingMedium, color: theme.text },
    productName: { ...typography.bodySmall, color: theme.textSecondary },
    priceCard: {
      alignItems: "center",
      gap: spacing.xs,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
    },
    price: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: "800",
      color: theme.primary,
      fontVariant: ["tabular-nums"],
    },
    hint: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    detailsCard: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.inputBackground,
    },
    detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    detailText: { flex: 1, ...typography.bodySmall, color: theme.text },
    primaryButton: {
      minHeight: 50,
      borderRadius: radius.md,
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    primaryText: { ...typography.bodyMedium, color: theme.surface, fontWeight: "800" },
    secondaryButton: {
      minHeight: 46,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: { ...typography.bodyMedium, color: theme.text, fontWeight: "700" },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
