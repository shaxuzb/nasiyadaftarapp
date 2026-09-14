import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

import type { SheetRenderProps } from "../types";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { usePaymentOrderLifecycle } from "../../modules/payments/hooks/usePaymentOrderLifecycle";
import { PaymentOrderContent } from "../../modules/payments/components/PaymentOrderContent";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";

const COPY = {
  uz: {
    title: "To‘lov holati",
    waiting: "To‘lov hali yakunlanmagan. To‘lov oynasini davom ettirishingiz yoki holatni tekshirishingiz mumkin.",
    activating: "To‘lov qabul qilindi. Xizmat backend tomonidan faollashtirilmoqda.",
    success: "To‘lov muvaffaqiyatli yakunlandi va xizmat faollashtirildi.",
    terminal: "Ushbu to‘lov yakunlangan. Yangi xarid uchun tarif yoki SMS paketni qayta tanlang.",
    continue: "To‘lovni davom ettirish",
    refresh: "Holatni yangilash",
    cancel: "To‘lovni bekor qilish",
    close: "Yopish",
    cancelTitle: "To‘lovni bekor qilasizmi?",
    cancelMessage: "Faqat hali to‘lanmagan buyurtma bekor qilinadi.",
    error: "To‘lov holatini yangilab bo‘lmadi",
    openError: "To‘lov sahifasini ochib bo‘lmadi",
    loading: "To‘lov ma’lumoti yuklanmoqda...",
  },
  ru: {
    title: "Статус оплаты",
    waiting: "Оплата ещё не завершена. Можно продолжить оплату или обновить статус.",
    activating: "Оплата получена. Услуга активируется на сервере.",
    success: "Оплата успешно завершена, услуга активирована.",
    terminal: "Этот платёж завершён. Для новой покупки снова выберите тариф или пакет SMS.",
    continue: "Продолжить оплату",
    refresh: "Обновить статус",
    cancel: "Отменить оплату",
    close: "Закрыть",
    cancelTitle: "Отменить оплату?",
    cancelMessage: "Можно отменить только ещё не оплаченный заказ.",
    error: "Не удалось обновить статус оплаты",
    openError: "Не удалось открыть страницу оплаты",
    loading: "Загрузка данных оплаты...",
  },
} as const;

export function PaymentStatusSheet({
  props,
  closeSheet,
}: SheetRenderProps<"paymentStatus">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const copy = COPY[locale === "ru" ? "ru" : "uz"];
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const openedOnMountRef = useRef(false);
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
  } = usePaymentOrderLifecycle(props.orderId, { syncOnForeground: true });
  const busy = isSyncing || isCancelling || isOpeningCheckout;

  useEffect(() => {
    if (
      !props.openCheckoutOnMount ||
      openedOnMountRef.current ||
      !order ||
      order.status !== "pending"
    ) {
      return;
    }
    openedOnMountRef.current = true;
    void openCheckout().catch(() => {
      showToast(copy.openError, "error");
    });
  }, [copy.openError, openCheckout, order, props.openCheckoutOnMount, showToast]);

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

  const fulfilled = order.status === "paid" && order.isFulfilled;
  const paidPendingFulfillment = order.status === "paid" && !order.isFulfilled;
  const pending = order.status === "pending";
  const description = fulfilled
    ? copy.success
    : paidPendingFulfillment
      ? copy.activating
      : pending
        ? copy.waiting
        : copy.terminal;

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>{copy.title}</Text>
      <PaymentOrderContent order={order} />
      <Text style={styles.description}>{description}</Text>

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
            onPress={() => void openCheckout().catch(() => showToast(copy.openError, "error"))}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}
          >
            {isOpeningCheckout ? <ActivityIndicator size="small" color={theme.surface} /> : null}
            <Text style={styles.primaryText}>{copy.continue}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleSync()}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed, busy && styles.disabled]}
          >
            {isSyncing ? <ActivityIndicator size="small" color={theme.primary} /> : null}
            <Text style={styles.secondaryText}>{copy.refresh}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleCancel()}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed, busy && styles.disabled]}
          >
            <Text style={styles.dangerText}>{copy.cancel}</Text>
          </Pressable>
        </View>
      ) : paidPendingFulfillment ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void handleSync()}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed, busy && styles.disabled]}
        >
          {isSyncing ? <ActivityIndicator size="small" color={theme.surface} /> : null}
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
    title: {
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
    },
    description: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: "center",
      lineHeight: 20,
    },
    loading: {
      minHeight: 220,
      padding: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
    },
    muted: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      textAlign: "center",
    },
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
