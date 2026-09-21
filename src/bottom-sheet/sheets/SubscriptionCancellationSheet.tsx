import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SheetRenderProps } from "../types";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "../../i18n";
import { queryKeys } from "../../core/query/queryKeys";
import { useQueryClient } from "@tanstack/react-query";
import { cancelCurrentSubscription } from "../../modules/subscription/services/subscriptionService";
import { getApiErrorMessage } from "../../utils/apiError";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";

export function SubscriptionCancellationSheet({
  props,
  closeSheet,
  openSheet,
  setDismissLocked,
}: SheetRenderProps<"subscriptionCancellation">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { user, refreshSubscription } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting) return;

    const accepted = await confirm({
      title: t("subscription.cancelPlanConfirmTitle"),
      message: t("subscription.cancelPlanConfirmMessage"),
      confirmText: t("subscription.cancelPlanConfirmAction"),
      cancelText: t("subscription.cancelPlanBack"),
      variant: "danger",
    });
    if (!accepted) return;

    setIsSubmitting(true);
    setDismissLocked(true);

    try {
      const updatedSubscription = await cancelCurrentSubscription();
      if (user) {
        queryClient.setQueryData(
          queryKeys.subscriptionCurrent(user.id),
          updatedSubscription,
        );
      }
      await refreshSubscription().catch(() => undefined);
      setDismissLocked(false);
      closeSheet(() =>
        openSheet("paymentCheckout", {
          productType: "subscription",
          plan: props.targetPlan,
        }),
      );
    } catch (error) {
      setDismissLocked(false);
      setIsSubmitting(false);
      showToast(
        getApiErrorMessage(error, t("subscription.cancelPlanError")),
        "error",
      );
    }
  };

  return (
    <BottomSheetScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, spacing.md) + 10 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroIcon}>
        <Ionicons
          name="swap-horizontal-outline"
          size={27}
          color={theme.primary}
        />
      </View>
      <Text style={styles.title}>{t("subscription.cancelPlanTitle")}</Text>
      <Text style={styles.description}>
        {t("subscription.cancelPlanDescription")}
      </Text>

      <View style={styles.benefit}>
        <View style={styles.benefitIcon}>
          <Ionicons name="checkmark" size={22} color={theme.primary} />
        </View>
        <View style={styles.benefitCopy}>
          <Text style={styles.benefitTitle}>
            {t("subscription.cancelPlanBenefitTitle")}
          </Text>
          <Text style={styles.benefitDescription}>
            {t("subscription.cancelPlanBenefitDescription")}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
        disabled={isSubmitting}
        onPress={() => void handleConfirm()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          isSubmitting && styles.disabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color={theme.surface} />
        ) : null}
        <Text style={styles.primaryText}>
          {isSubmitting
            ? t("subscription.cancellingPlan")
            : t("subscription.cancelAndContinue")}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isSubmitting}
        onPress={() => closeSheet()}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.pressed,
          isSubmitting && styles.disabled,
        ]}
      >
        <Text style={styles.secondaryText}>
          {t("subscription.cancelPlanBack")}
        </Text>
      </Pressable>
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      gap: spacing.sm,
      backgroundColor: theme.surface,
    },
    heroIcon: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
      marginBottom: 2,
    },
    title: { ...typography.headingMedium, color: theme.text },
    description: {
      ...typography.bodySmall,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    benefit: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
    },
    benefitIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    benefitCopy: { flex: 1, gap: 2 },
    benefitTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    benefitDescription: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    primaryButton: {
      minHeight: 50,
      marginTop: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: theme.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    primaryText: {
      ...typography.bodyMedium,
      color: theme.surface,
      fontWeight: "800",
    },
    secondaryButton: {
      minHeight: 44,
      borderRadius: radius.md,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
