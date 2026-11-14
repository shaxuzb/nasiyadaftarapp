import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { registerCurrencySymbols, useTranslation, type TranslateKey } from "../../../i18n";
import type { Translate } from "../../../i18n/translate";
import { BUILT_IN_CURRENCIES, type Currency } from "../data/currencies";
import { getCurrencies } from "../services/currencyService";

const CURRENCIES_KEY = ["currencies"] as const;
const TRANSLATED = new Set(BUILT_IN_CURRENCIES.map((currency) => currency.code));

/** The currency's name in the app's language; the server's name for one the app does not know yet. */
export function currencyDisplayName(currency: Currency, t: Translate): string {
  return TRANSLATED.has(currency.code)
    ? t(`setup.currencyNames.${currency.code}` as TranslateKey)
    : currency.name;
}

/**
 * The currencies on offer: the built-in list at once (and offline), the
 * server's as soon as it answers. Asked for once a day at most.
 */
export function useCurrencies(): { currencies: readonly Currency[]; isFromServer: boolean } {
  const query = useQuery({
    queryKey: CURRENCIES_KEY,
    queryFn: async ({ signal }) => {
      const list = await getCurrencies(signal);
      registerCurrencySymbols(list);
      return list;
    },
    staleTime: 24 * 60 * 60_000,
    gcTime: Infinity,
  });
  return {
    currencies: query.data ?? BUILT_IN_CURRENCIES,
    isFromServer: query.data !== undefined,
  };
}

/** The list with each currency's name in the app's language. */
export function useNamedCurrencies(): readonly (Currency & { displayName: string })[] {
  const { t } = useTranslation();
  const { currencies } = useCurrencies();
  return useMemo(
    () => currencies.map((currency) => ({ ...currency, displayName: currencyDisplayName(currency, t) })),
    [currencies, t],
  );
}
