/**
 * The ways to pay, as the backend lists them (GET /payments/providers):
 *
 *   [ { code: "payme", title: "Payme", isDefault: true },
 *     { code: "click", title: "Click", isDefault: false } ]
 *
 * The app draws one tile per entry and sends the chosen `code` back when the
 * payment is started, so a provider can be added or switched off on the server
 * without a release.
 */
export interface PaymentProvider {
  code: string;
  title: string;
  isDefault: boolean;
}

/**
 * A provider code as the app compares and sends it. Orders report theirs in
 * whatever case the server stored ("Payme"), the list in lower case.
 */
export function normalizeProviderCode(
  value: string | null | undefined,
): string | null {
  const code = value?.trim().toLowerCase();
  return code && /^[a-z0-9_-]{1,32}$/.test(code) ? code : null;
}

/**
 * Reads the list. Anything that is not a list is an error, so the caller can
 * fall back to paying without a choice; a malformed entry is skipped without
 * costing the rest.
 */
export function parsePaymentProviders(payload: unknown): PaymentProvider[] {
  if (!Array.isArray(payload)) {
    throw new Error("Payment providers response is not a list");
  }

  const providers: PaymentProvider[] = [];
  const seen = new Set<string>();
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const { code, title, isDefault } = item as Record<string, unknown>;
    const cleanCode = normalizeProviderCode(typeof code === "string" ? code : null);
    if (!cleanCode || seen.has(cleanCode)) continue;
    seen.add(cleanCode);
    providers.push({
      code: cleanCode,
      title: (typeof title === "string" && title.trim()) || cleanCode,
      isDefault: isDefault === true,
    });
  }
  return providers;
}

/**
 * Which provider is chosen before the user touches anything: the one the
 * server marks as default, or the only one there is. With several and no
 * default, none: the user has to say.
 */
export function getDefaultProviderCode(
  providers: readonly PaymentProvider[],
): string | null {
  const marked = providers.find((provider) => provider.isDefault);
  if (marked) return marked.code;
  return providers.length === 1 ? providers[0].code : null;
}
