import type { PaymentOrder, PaymentProductType, PaymentStatus } from "../types";

type RecordValue = Record<string, unknown>;

const PRODUCT_TYPES: ReadonlySet<PaymentProductType> = new Set([
  "subscription",
  "sms_package",
]);

const STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "pending",
  "holding",
  "paid",
  "cancelled",
  "failed",
  "expired",
  "refunded",
]);

function invalid(): never {
  throw new Error("Invalid payment order");
}

function record(value: unknown): RecordValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as RecordValue;
}

function unwrap(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const outer = value as RecordValue;
  if (outer.data !== undefined) return outer.data;
  if (outer.result !== undefined) return outer.result;
  return value;
}

function positiveInteger(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    invalid();
  }
  return value;
}

function nullablePositiveInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return positiveInteger(value);
}

function nonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    invalid();
  }
  return value;
}

function requiredText(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) invalid();
  return value.trim();
}

function nullableText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") invalid();
  const trimmed = value.trim();
  return trimmed || null;
}

function nullableHttpsUrl(value: unknown): string | null {
  const text = nullableText(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:") invalid();
    return text;
  } catch {
    return invalid();
  }
}

function productType(value: unknown): PaymentProductType {
  if (
    typeof value !== "string" ||
    !PRODUCT_TYPES.has(value as PaymentProductType)
  ) {
    invalid();
  }
  return value as PaymentProductType;
}

function status(value: unknown): PaymentStatus {
  if (typeof value !== "string" || !STATUSES.has(value as PaymentStatus)) {
    invalid();
  }
  return value as PaymentStatus;
}

function boolean(value: unknown): boolean {
  if (typeof value !== "boolean") invalid();
  return value;
}

export function parsePaymentOrder(input: unknown): PaymentOrder {
  const value = record(unwrap(input));
  const links = record(value.paymentLinks);

  return {
    id: positiveInteger(value.id),

    productType: productType(value.productType),
    productId: positiveInteger(value.productId),
    productCode: requiredText(value.productCode),
    productName: requiredText(value.productName),

    amount: nonNegativeNumber(value.amount),
    amountTiyin: nonNegativeNumber(value.amountTiyin),
    currency: requiredText(value.currency),

    status: status(value.status),
    remoteStatus: nullableText(value.remoteStatus),

    externalId: nullableText(value.externalId),
    invoiceId: nullableText(value.invoiceId),
    accountNumber: nullableText(value.accountNumber),

    provider: nullableText(value.provider),

    paymentServiceTransactionId: nullablePositiveInteger(
      value.paymentServiceTransactionId,
    ),

    providerTransactionId: nullableText(value.providerTransactionId),

    paymentUrl: nullableHttpsUrl(value.paymentUrl),

    paymentLinks: {
      payme: nullableHttpsUrl(links.payme),
    },

    createdDate: requiredText(value.createdDate),
    updatedDate: nullableText(value.updatedDate),
    paidDate: nullableText(value.paidDate),
    fulfilledDate: nullableText(value.fulfilledDate),
    reversedDate: nullableText(value.reversedDate),

    isFulfilled: boolean(value.isFulfilled),
  };
}

export function parsePaymentOrders(input: unknown): PaymentOrder[] {
  const value = unwrap(input);

  const items = Array.isArray(value)
    ? value
    : Array.isArray(record(value).results)
      ? (record(value).results as unknown[])
      : invalid();
  return items.map(parsePaymentOrder);
}
