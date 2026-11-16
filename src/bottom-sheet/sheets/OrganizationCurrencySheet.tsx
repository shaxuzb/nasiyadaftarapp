import React, { memo, useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { SheetRenderProps } from "../types";
import { useAuth } from "../../context/AuthContext";
import { useConfirmDialog } from "../../context/ConfirmDialogContext";
import { useToast } from "../../context/ToastContext";
import { queryKeys } from "../../core/query/queryKeys";
import { useTheme } from "../../hooks/useTheme";
import { formatLocalizedCurrency, getLocalizedApiErrorMessage, useTranslation } from "../../i18n";
import { radius, spacing, typography } from "../../theme";
import type { AppTheme } from "../../types";
import type { Currency } from "../../modules/currency/data/currencies";
import { CurrencyCodeBadge } from "../../modules/currency/components/CurrencyCodeBadge";
import { useNamedCurrencies } from "../../modules/currency/hooks/useCurrencies";
import { useOrganizationCurrencyCode } from "../../modules/currency/hooks/useMoney";
import {
  getCurrentOrganization,
  updateCurrentOrganizationCurrency,
} from "../../modules/organization/services/organizationService";
import { hapticError, hapticSuccess } from "../../utils/haptics";

type NamedCurrency = Currency & { displayName: string };

interface RowProps {
  currency: NamedCurrency;
  selected: boolean;
  saving: boolean;
  disabled: boolean;
  currentLabel: string;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
  onSelect: (currency: NamedCurrency) => void;
}

const CurrencyRow = memo(function CurrencyRow({
  currency,
  selected,
  saving,
  disabled,
  currentLabel,
  styles,
  theme,
  onSelect,
}: RowProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled, busy: saving }}
      accessibilityLabel={`${currency.code}, ${currency.displayName}${selected ? `, ${currentLabel}` : ""}`}
      disabled={disabled}
      onPress={() => onSelect(currency)}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        disabled && !selected && !saving && styles.rowDisabled,
        pressed && styles.pressed,
      ]}
    >
      <CurrencyCodeBadge code={currency.code} selected={selected} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {currency.displayName}
        </Text>
        <Text style={styles.rowCode}>
          {selected ? `${currency.symbol} · ${currentLabel}` : currency.symbol}
        </Text>
      </View>
      {saving ? (
        <ActivityIndicator size="small" color={theme.primary} />
      ) : (
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </View>
      )}
    </Pressable>
  );
});

/**
 * The organization's currency. Choosing another one asks first, in plain
 * words: amounts are not converted (250 000 so'm reads 250 000 $), and
 * customers' SMS and Telegram messages use the new currency too. Plans and
 * SMS packages stay in so'm.
 */
export function OrganizationCurrencySheet({ closeSheet, setDismissLocked }: SheetRenderProps<"organizationCurrency">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { locale, t } = useTranslation();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { currentOrganization, applyOrganizationUpdate } = useAuth();
  const currencies = useNamedCurrencies();
  const currentCode = useOrganizationCurrencyCode();
  const [savingCode, setSavingCode] = useState<string | null>(null);

  const current = currencies.find((currency) => currency.code === currentCode);

  const choose = useCallback(
    async (next: NamedCurrency) => {
      if (savingCode || next.code === currentCode || !currentOrganization) return;
      const example = 250_000;
      const accepted = await confirm({
        title: t("currency.confirmTitle"),
        message: t("currency.confirmMessage", {
          from: formatLocalizedCurrency(example, locale, currentCode),
          to: formatLocalizedCurrency(example, locale, next.code),
        }),
        confirmText: t("currency.confirm"),
        cancelText: t("common.cancel"),
      });
      if (!accepted) return;

      setSavingCode(next.code);
      setDismissLocked(true);
      try {
        const updated =
          (await updateCurrentOrganizationCurrency(next.code)) ?? (await getCurrentOrganization());
        await applyOrganizationUpdate(
          updated ?? { id: currentOrganization.id, name: currentOrganization.name, currencyCode: next.code },
        );
        // The SMS texts the server writes now carry the new currency.
        void queryClient.invalidateQueries({ queryKey: queryKeys.clientSmsRoot() });
        hapticSuccess();
        showToast(t("currency.changed", { name: next.displayName }), "success");
        setDismissLocked(false);
        closeSheet();
      } catch (error) {
        hapticError();
        showToast(getLocalizedApiErrorMessage(error, "currency.changeError", t), "error");
        setDismissLocked(false);
      } finally {
        setSavingCode(null);
      }
    },
    [
      applyOrganizationUpdate,
      closeSheet,
      confirm,
      currentCode,
      currentOrganization,
      locale,
      queryClient,
      savingCode,
      setDismissLocked,
      showToast,
      t,
    ],
  );

  return (
    <BottomSheetScrollView
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom + spacing.md, spacing.xl) }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="cash-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.titleCopy}>
          <Text style={styles.title}>{t("currency.sheetTitle")}</Text>
          <Text style={styles.description}>
            {current
              ? t("currency.sheetDescription", { name: current.displayName })
              : t("currency.sheetDescriptionPlain")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          disabled={savingCode !== null}
          onPress={() => closeSheet()}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={23} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.list} accessibilityRole="radiogroup">
        {currencies.map((currency) => (
          <CurrencyRow
            key={currency.code}
            currency={currency}
            selected={currency.code === currentCode}
            saving={savingCode === currency.code}
            disabled={savingCode !== null}
            currentLabel={t("currency.current")}
            styles={styles}
            theme={theme}
            onSelect={(item) => void choose(item)}
          />
        ))}
      </View>

      {/* What changing it does, under the list: read when it matters. */}
      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={16} color={theme.textMuted} />
        <Text style={styles.noteText}>{t("currency.note")}</Text>
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
    header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
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
    note: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      paddingHorizontal: spacing.xs,
    },
    noteText: { flex: 1, ...typography.caption, color: theme.textMuted },
    list: { gap: spacing.xs },
    row: {
      minHeight: 60,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
    },
    rowSelected: { borderWidth: 1.5, borderColor: theme.primary, backgroundColor: theme.primaryLight },
    radio: {
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    radioSelected: { borderColor: theme.primary, backgroundColor: theme.primary },
    rowDisabled: { opacity: 0.5 },
    rowCopy: { flex: 1, minWidth: 0, gap: 1 },
    rowTitle: { ...typography.bodyMedium, color: theme.text, fontWeight: "700" },
    rowCode: { ...typography.caption, color: theme.textSecondary },
    pressed: { opacity: 0.72 },
  });
