import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import type { SheetRenderProps } from "../types";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { getPaymentCopy } from "../../modules/payments/i18n/paymentCopy";
import { PaymentOrderContent } from "../../modules/payments/components/PaymentOrderContent";
import { usePaymentOrderLifecycle } from "../../modules/payments/hooks/usePaymentOrderLifecycle";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";

export function PaymentDetailSheet({
  props,
  closeSheet,
}: SheetRenderProps<"paymentDetail">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const copy = getPaymentCopy(locale).detailSheet;
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const [syncAfterOpen, setSyncAfterOpen] = useState(false);
  const {
    order,
    isLoading,
    isSyncing,
    isCancelling,
    isOpeningCheckout,
    error,
    sync,
    cancel,
    openCheckout,
  } = usePaymentOrderLifecycle(props.orderId, {
    syncOnForeground: syncAfterOpen,
  });
  const busy = isSyncing || isCancelling || isOpeningCheckout;

  const handleContinue = async () => {
    try {
      await openCheckout();
      setSyncAfterOpen(true);
    } catch {
      showToast(copy.openError, "error");
    }
  };

  const handleSync = async () => {
    try {
      await sync();
    } catch {
      showToast(copy.error, "error");
    }
  };

  const handleCancel = async () => {
    const accepted = await confirm({
      title: copy.cancelTitle,
      message: copy.cancelMessage,
      confirmText: copy.cancel,
      cancelText: t("common.cancel"),
      variant: "danger",
    });
    if (!accepted) return;
    try {
      await cancel();
    } catch {
      showToast(copy.error, "error");
    }
  };

  if (isLoading && !order) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.muted}>{copy.loading}</Text>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.loading}>
        <Ionicons name="alert-circle-outline" size={28} color={theme.dangerColor} />
        <Text style={styles.muted}>{copy.error}</Text>
        <Pressable onPress={() => closeSheet()} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>{copy.close}</Text>
        </Pressable>
      </View>
    );
  }

  const pending = order.status === "pending";
  const paidPendingFulfillment = order.status === "paid" && !order.isFulfilled;

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{copy.title}</Text>
      <PaymentOrderContent order={order} />

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.dangerColor} />
          <Text style={styles.errorText}>{copy.error}</Text>
        </View>
      ) : null}

      {pending ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleContinue()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            {isOpeningCheckout ? (
              <ActivityIndicator size="small" color={theme.surface} />
            ) : null}
            <Text style={styles.primaryText}>{copy.continue}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleSync()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : null}
            <Text style={styles.secondaryText}>{copy.refresh}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleCancel()}
            style={({ pressed }) => [
              styles.dangerButton,
              pressed && styles.pressed,
              busy && styles.disabled,
            ]}
          >
            <Text style={styles.dangerText}>{copy.cancel}</Text>
          </Pressable>
        </View>
      ) : paidPendingFulfillment ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void handleSync()}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            busy && styles.disabled,
          ]}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={theme.surface} />
          ) : null}
          <Text style={styles.primaryText}>{copy.refresh}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => closeSheet()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{copy.close}</Text>
        </Pressable>
      )}
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
    title: { ...typography.headingLarge, color: theme.text, textAlign: "center" },
    loading: {
      minHeight: 220,
      padding: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    muted: { ...typography.bodySmall, color: theme.textSecondary, textAlign: "center" },
    actions: { gap: spacing.sm },
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
      minHeight: 48,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    secondaryText: { ...typography.bodyMedium, color: theme.text, fontWeight: "700" },
    dangerButton: {
      minHeight: 46,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: `${theme.dangerColor}12`,
    },
    dangerText: { ...typography.bodySmall, color: theme.dangerColor, fontWeight: "800" },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: `${theme.dangerColor}10`,
    },
    errorText: { flex: 1, ...typography.bodySmall, color: theme.dangerColor },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
