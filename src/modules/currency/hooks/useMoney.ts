import { useMemo } from "react";

import { useAuth } from "../../../context/AuthContext";
import {
  currencyLabel,
  formatLocalizedCurrency,
  formatLocalizedDisplayedBalance,
  useTranslation,
} from "../../../i18n";
import { currencyAllowsFraction, DEFAULT_CURRENCY_CODE, normalizeCurrencyCode } from "../data/currencies";

/** The current organization's currency; the sum until it is known. */
export function useOrganizationCurrencyCode(): string {
  const { currentOrganization } = useAuth();
  return normalizeCurrencyCode(currentOrganization?.currencyCode) ?? DEFAULT_CURRENCY_CODE;
}

export interface Money {
  currencyCode: string;
  /** Written after an amount: "so‘m", "$". */
  label: string;
  /** Whether amounts can be typed with cents (not for the sum). */
  allowsFraction: boolean;
  /** "250 000 so‘m", "120,50 $". */
  format: (amount: number) => string;
  /** A balance as the lists show it: "+120 $" (credit), "-120 $" (owed). */
  formatBalance: (amount: number) => string;
}

/**
 * Debts, payments and balances in the organization's currency. Plans and
 * SMS packages are always in the sum and keep formatLocalizedCurrency.
 */
export function useMoney(): Money {
  const { locale } = useTranslation();
  const currencyCode = useOrganizationCurrencyCode();
  return useMemo(
    () => ({
      currencyCode,
      label: currencyLabel(currencyCode, locale),
      allowsFraction: currencyAllowsFraction(currencyCode),
      format: (amount: number) => formatLocalizedCurrency(amount, locale, currencyCode),
      formatBalance: (amount: number) => formatLocalizedDisplayedBalance(amount, locale, currencyCode),
    }),
    [currencyCode, locale],
  );
}
