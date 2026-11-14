/**
 * The currencies an organization can keep its book in. The list comes from
 * GET /currencies; this copy of it is what the app shows before that answers
 * and offline. Amounts are never converted: changing the currency only
 * changes the sign written after them.
 */
export interface Currency {
  /** ISO code: "UZS", "USD"… */
  code: string;
  /** The name the server gives (in Uzbek); the app's own translation comes first. */
  name: string;
  /** Written after an amount in the app: "$", "€", "so'm". */
  symbol: string;
  /** The word the server writes in SMS and bots: "dollar", "yevro". */
  unit: string;
}

export const DEFAULT_CURRENCY_CODE = "UZS";

export const BUILT_IN_CURRENCIES: readonly Currency[] = [
  { code: "UZS", name: "O'zbek so'mi", symbol: "so'm", unit: "so'm" },
  { code: "USD", name: "AQSH dollari", symbol: "$", unit: "dollar" },
  { code: "EUR", name: "Yevro", symbol: "€", unit: "yevro" },
  { code: "RUB", name: "Rossiya rubli", symbol: "₽", unit: "rubl" },
  { code: "KZT", name: "Qozog'iston tengesi", symbol: "₸", unit: "tenge" },
  { code: "KGS", name: "Qirg'iz somi", symbol: "сом", unit: "som" },
  { code: "TJS", name: "Tojik somoniysi", symbol: "SM", unit: "somoniy" },
  { code: "TMT", name: "Turkman manati", symbol: "m", unit: "manat" },
  { code: "AZN", name: "Ozarbayjon manati", symbol: "₼", unit: "manat" },
  { code: "BYN", name: "Belarus rubli", symbol: "Br", unit: "rubl" },
  { code: "AMD", name: "Arman drami", symbol: "֏", unit: "dram" },
];

/** The country (or union) whose flag stands for each currency. */
const CURRENCY_FLAGS: Record<string, string> = {
  UZS: "UZ",
  USD: "US",
  EUR: "EU",
  RUB: "RU",
  KZT: "KZ",
  KGS: "KG",
  TJS: "TJ",
  TMT: "TM",
  AZN: "AZ",
  BYN: "BY",
  AMD: "AM",
};

/** A flag for the currency: its country's, or none for one the app does not know. */
export function currencyFlag(code: string): string | null {
  return CURRENCY_FLAGS[code] ?? null;
}

/** "USD" for "usd" or " USD "; null for anything that is not a three-letter code. */
export function normalizeCurrencyCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

/** The sum is kept in whole numbers; every other currency can have cents ("120,50"). */
export function currencyAllowsFraction(code: string): boolean {
  return code !== DEFAULT_CURRENCY_CODE;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** GET /currencies, read defensively; the built-in list when it says nothing usable. */
export function parseCurrencies(data: unknown): Currency[] {
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { data?: unknown } | null)?.data)
      ? ((data as { data: unknown[] }).data)
      : [];
  const seen = new Set<string>();
  const list: Currency[] = [];
  for (const item of items) {
    const value = (item ?? {}) as Record<string, unknown>;
    const code = normalizeCurrencyCode(value.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    const symbol = text(value.symbol) || code;
    list.push({ code, name: text(value.name) || code, symbol, unit: text(value.unit) || symbol });
  }
  return list.length > 0 ? list : [...BUILT_IN_CURRENCIES];
}
