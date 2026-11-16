import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";

import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import { SetupChoiceStep, type SetupChoice } from "../../setup/components/SetupChoiceStep";
import { filterByQuery } from "../../setup/data/setupOptions";
import { updateCurrentOrganizationCurrency } from "../../organization/services/organizationService";
import { useNamedCurrencies } from "../hooks/useCurrencies";
import { useOrganizationCurrencyCode } from "../hooks/useMoney";
import { clearCurrencySetupPending, usePendingCurrencySetup } from "../state/currencySetup";

/**
 * Right after an organization is created on this phone: which currency its
 * debts and payments are kept in. Asked once, before its screens show any
 * amount; chosen, it never comes back (Settings changes it later). Nothing
 * is recorded yet, so there is nothing to warn about.
 */
export function OrganizationCurrencySetupGate() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { user, currentOrganization, applyOrganizationUpdate } = useAuth();
  const pending = usePendingCurrencySetup();
  const currencies = useNamedCurrencies();
  const currentCode = useOrganizationCurrencyCode();
  const [selected, setSelected] = useState(currentCode);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible =
    pending !== null &&
    user?.id === pending.userId &&
    currentOrganization?.id === pending.organizationId;

  // Opens on the organization's own currency (so'm, as created).
  useEffect(() => {
    if (visible) setSelected(currentCode);
    // Only when it opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const choices = useMemo<SetupChoice[]>(
    () =>
      filterByQuery(currencies, query, (item) => `${item.displayName} ${item.name} ${item.code} ${item.symbol}`).map(
        (item) => ({
          key: item.code,
          code: item.code,
          title: item.displayName,
          subtitle: item.symbol === item.code ? undefined : item.symbol,
        }),
      ),
    [currencies, query],
  );

  const confirm = useCallback(async () => {
    if (saving || !currentOrganization) return;
    setError(null);
    // Already so: nothing to send.
    if (selected === currentCode) {
      await clearCurrencySetupPending();
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCurrentOrganizationCurrency(selected);
      await applyOrganizationUpdate(
        updated ?? { id: currentOrganization.id, name: currentOrganization.name, currencyCode: selected },
      );
      await clearCurrencySetupPending();
    } catch (failure) {
      setError(getLocalizedApiErrorMessage(failure, "currency.changeError", t));
    } finally {
      setSaving(false);
    }
  }, [applyOrganizationUpdate, currentCode, currentOrganization, saving, selected, t]);

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      // Chosen, not dismissed: the back button does not skip it.
      onRequestClose={() => undefined}
    >
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <SetupChoiceStep
          step={1}
          stepCount={1}
          title={t("currency.setupTitle")}
          subtitle={t("currency.setupSubtitle")}
          searchPlaceholder={t("currency.setupSearch")}
          query={query}
          onQueryChange={setQuery}
          choices={choices}
          selectedKey={selected}
          onSelect={(code) => {
            setError(null);
            setSelected(code);
          }}
          actionLabel={t("currency.setupAction")}
          onAction={() => void confirm()}
          actionLoading={saving}
          errorText={error}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
