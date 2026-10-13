import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import type { SheetRenderProps } from "../types";
import { useToast } from "../../context/ToastContext";
import { useTheme } from "../../hooks/useTheme";
import { formatLocalizedCurrency, useTranslation } from "../../i18n";
import { getApiErrorUserMessage } from "../../i18n/apiErrors";
import { getPaymentCopy } from "../../modules/payments/i18n/paymentCopy";
import { PaymentMethodSelector } from "../../modules/payments/components/PaymentMethodSelector";
import { DiscountSummary } from "../../modules/subscription/components/PriceDiscount";
import { usePaymentCheckout } from "../../modules/payments/hooks/usePaymentCheckout";
import { usePaymentProviders } from "../../modules/payments/hooks/usePaymentQueries";
import {
  getDefaultProviderCode,
  type PaymentProvider,
} from "../../modules/payments/utils/paymentProviders";
import { isPaymentFulfilled } from "../../modules/payments/utils/paymentState";
import { PendingPaymentCheckoutError } from "../../modules/payments/utils/paymentRecovery";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const NO_PROVIDERS: readonly PaymentProvider[] = [];

function fill(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (token, key) =>
    values[key] === undefined ? token : String(values[key]),
  );
}

export function PaymentCheckoutSheet({
  props,
  closeSheet,
  setDismissLocked,
  openSheet,
}: SheetRenderProps<"paymentCheckout">) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale } = useTranslation();
  const paymentCopy = getPaymentCopy(locale);
  const copy = paymentCopy.checkout;
  const { showToast } = useToast();
  const {
    startCheckout,
    openCheckoutPage,
    isCreating: isRequesting,
  } = usePaymentCheckout();
  const submittingRef = useRef(false);
  // Stays on after the order is created, while the payment page is opened and
  // the sheet closes: the button should not look idle for that moment.
  const [submitting, setSubmitting] = useState(false);
  const isCreating = isRequesting || submitting;
  // What the user tapped; until they do, the server's default stands.
  const [chosen, setChosen] = useState<string | null>(null);

  const isPlan = props.productType === "subscription";
  const product = isPlan ? props.plan : props.package;
  const amount = product.price;
  // A free plan has nothing to pay, so nothing to choose.
  const needsMethod = amount > 0;
  const providersQuery = usePaymentProviders(needsMethod);
  const providers = providersQuery.data ?? NO_PROVIDERS;
  // The first answer is still on its way. Paying waits for it, so the order
  // is not created through the default a moment before the tiles appear.
  const loadingMethods =
    needsMethod && providersQuery.isFetching && providersQuery.data === undefined;
  // No list (an older server, or the request failed) means no tiles and a
  // payment without a provider, which the server takes as before.
  const showMethods = needsMethod && providers.length > 0;
  const method =
    chosen !== null && providers.some((provider) => provider.code === chosen)
      ? chosen
      : getDefaultProviderCode(providers);
  const waitingForMethod = loadingMethods || (showMethods && method === null);
  const primaryLabel =
    amount === 0 && isPlan
      ? copy.activate
      : isPlan
        ? fill(copy.pay, { amount: formatLocalizedCurrency(amount, locale) })
        : copy.buyPackage;
  const actionLabel = isCreating ? copy.processing : primaryLabel;

  const handleConfirm = async () => {
    if (submittingRef.current || waitingForMethod) return;
    submittingRef.current = true;
    setSubmitting(true);
    setDismissLocked(true);
    try {
      const result = await startCheckout({
        productType: props.productType,
        productId: product.id,
        provider: showMethods ? method : null,
      });
      const orderId = result.order.id;

      // Nothing to pay outside the app (a free plan, or already settled):
      // show how the order stands.
      if (!result.checkoutUrl || isPaymentFulfilled(result.order)) {
        setDismissLocked(false);
        closeSheet(() => openSheet("paymentStatus", { orderId }));
        return;
      }

      try {
        await openCheckoutPage(result);
      } catch {
        // The order exists but its page would not open. Its status sheet has
        // the button to try again.
        setDismissLocked(false);
        closeSheet(() => openSheet("paymentStatus", { orderId }));
        showToast(paymentCopy.statusSheet.openError, "error");
        return;
      }

      // The user is on the provider's page now and this sheet has done its
      // job. The status sheet comes up when they are back in the app; see
      // PaymentRecoveryGate.
      setDismissLocked(false);
      closeSheet();
    } catch (error) {
      setDismissLocked(false);
      submittingRef.current = false;
      if (error instanceof PendingPaymentCheckoutError) {
        closeSheet(() => {
          if (error.redirect.type === "paymentStatus") {
            openSheet("paymentStatus", { orderId: error.redirect.orderId });
          } else {
            openSheet("pendingPayments", {
              payments: error.redirect.payments,
            });
          }
        });
        return;
      }
      setSubmitting(false);
      // The server says why in its own words, e.g. a provider it no longer
      // accepts.
      showToast(getApiErrorUserMessage(error) ?? copy.error, "error");
    }
  };

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
      {/* Just what is being bought. The sheet's own content — price, payment
          method, pay button — already says this is a confirmation, so a title
          and an icon above it only pushed that content down. */}
      <Text style={styles.productName} numberOfLines={2}>
        {product.name}
      </Text>

      <View style={styles.priceCard}>
        {/* The amount to pay is the price below; this only shows the saving. */}
        <DiscountSummary product={product} withCurrency />
        <Text style={styles.price}>
          {formatLocalizedCurrency(amount, locale)}
        </Text>
        <Text style={styles.hint}>
          {amount === 0 ? copy.freeHint : copy.externalHint}
        </Text>
      </View>

      {showMethods ? (
        <PaymentMethodSelector
          title={copy.methodTitle}
          hint={method === null ? copy.methodHint : undefined}
          providers={providers}
          value={method}
          onChange={setChosen}
          disabled={isCreating}
        />
      ) : loadingMethods ? (
        <View style={styles.methodsLoading}>
          <ActivityIndicator size="small" color={theme.textMuted} />
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{
          disabled: isCreating || waitingForMethod,
          busy: isCreating,
        }}
        disabled={isCreating || waitingForMethod}
        onPress={() => void handleConfirm()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
          (isCreating || waitingForMethod) && styles.disabled,
        ]}
      >
        {isCreating ? (
          <ActivityIndicator size="small" color={theme.surface} />
        ) : null}
        <Text style={styles.primaryText}>{actionLabel}</Text>
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
      gap: spacing.md,
      backgroundColor: theme.surface,
    },
    productName: {
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
    },
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
    // As tall as the title and tiles that take its place.
    methodsLoading: {
      height: 76,
      alignItems: "center",
      justifyContent: "center",
    },
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
    primaryText: {
      ...typography.bodyMedium,
      color: theme.surface,
      fontWeight: "800",
    },
    secondaryButton: {
      minHeight: 46,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryText: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
