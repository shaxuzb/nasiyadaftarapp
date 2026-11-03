import type {
  CurrentSubscription,
  SmsPackage,
  SubscriptionPlan,
  SubscriptionPlanPresentation,
  SubscriptionSmsQuota,
} from "../types";
import type { SubscriptionPlanPeriod } from "./planPeriods";

// Mirrors DEFAULT_PERIOD_MONTHS in planPeriods.ts; kept here so this file
// needs nothing from another module at run time.
const DEFAULT_PERIOD_MONTHS = 1;

type RecordValue = Record<string, unknown>;

const record = (value: unknown): RecordValue =>
  value && typeof value === "object" ? (value as RecordValue) : {};

const text = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const nullableText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const integer = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const amount = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const nullableInteger = (value: unknown) =>
  value === null || value === undefined ? null : integer(value);

// For oldPrice and discountPercent: absent, null, zero or not a number all
// mean "no discount to show".
const positiveOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const bool = (value: unknown) => value === true;

function unwrap(input: unknown): unknown {
  const outer = record(input);
  if (outer.data && typeof outer.data === "object") return outer.data;
  if (outer.result && typeof outer.result === "object") return outer.result;
  return input;
}

function parseQuota(input: unknown): SubscriptionSmsQuota {
  const value = record(input);
  const monthlyLimit = nullableInteger(value.monthlyLimit);
  const monthlyRemaining = nullableInteger(value.monthlyRemaining);
  const purchasedRemaining = Math.max(0, integer(value.purchasedRemaining));
  const totalRemaining =
    value.totalRemaining === null || value.totalRemaining === undefined
      ? monthlyRemaining === null
        ? null
        : Math.max(0, monthlyRemaining + purchasedRemaining)
      : Math.max(0, integer(value.totalRemaining));

  return {
    periodMonth: nullableText(value.periodMonth),
    periodEnd: nullableText(value.periodEnd),
    monthlyLimit,
    monthlyUsed: Math.max(0, integer(value.monthlyUsed)),
    monthlyRemaining,
    purchasedRemaining,
    totalRemaining,
  };
}

export function parseCurrentSubscription(input: unknown): CurrentSubscription {
  const value = record(unwrap(input));
  const maxOrganizations = nullableInteger(value.maxOrganizations);
  const maxClients = nullableInteger(value.maxClients);
  return {
    subscriptionId: Math.max(0, integer(value.subscriptionId)),
    planId: Math.max(0, integer(value.planId)),
    planCode: text(value.planCode, "FREE"),
    planName: text(value.planName),
    price: amount(value.price),
    startAt: text(value.startAt),
    endAt: nullableText(value.endAt),
    source: text(value.source, "system"),
    provider: nullableText(value.provider),
    cancellationRequestedAt: nullableText(value.cancellationRequestedAt),
    canRenew: bool(value.canRenew),
    maxOrganizations,
    maxClients,
    unlimitedOrganizations:
      bool(value.unlimitedOrganizations) || maxOrganizations === null,
    unlimitedClients: bool(value.unlimitedClients) || maxClients === null,
    telegramBotEnabled: bool(value.telegramBotEnabled),
    blacklistEnabled: bool(value.blacklistEnabled),
    transactionSmsEnabled: bool(value.transactionSmsEnabled),
    prioritySupportEnabled: bool(value.prioritySupportEnabled),
    sms: parseQuota(value.sms),
  };
}

const periodRecord = (value: unknown): RecordValue =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordValue)
    : {};

const nonNegativeOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

/**
 * The terms a plan is sold in, shortest first. A server that does not send
 * them yet sells one month at the plan's own price.
 */
export function parsePlanPeriods(
  raw: unknown,
  fallback: { price: number; oldPrice: number | null; discountPercent: number | null },
): SubscriptionPlanPeriod[] {
  const periods: SubscriptionPlanPeriod[] = [];
  const seen = new Set<number>();
  for (const entry of Array.isArray(raw) ? raw : []) {
    const item = periodRecord(entry);
    const months = Number(item.months);
    const price = nonNegativeOrNull(item.price);
    if (!Number.isInteger(months) || months <= 0 || price === null) continue;
    if (seen.has(months)) continue;
    seen.add(months);
    periods.push({
      months,
      price,
      oldPrice: positiveOrNull(item.oldPrice),
      discountPercent: positiveOrNull(item.discountPercent),
      monthlyPrice: nonNegativeOrNull(item.monthlyPrice) ?? Math.round(price / months),
    });
  }
  if (periods.length) return periods.sort((a, b) => a.months - b.months);

  return [
    {
      months: DEFAULT_PERIOD_MONTHS,
      price: fallback.price,
      oldPrice: fallback.oldPrice,
      discountPercent: fallback.discountPercent,
      monthlyPrice: fallback.price,
    },
  ];
}

function parsePlanPresentation(input: unknown): SubscriptionPlanPresentation {
  const raw = record(input);
  const badgeObject = record(raw.badge);
  const badge = text(raw.badge) || text(badgeObject.text) || text(badgeObject.label) || null;
  const icon = text(raw.icon) || null;
  const features = Array.isArray(raw.features) ? raw.features.flatMap((entry) => {
    if (typeof entry === "string") {
      return entry.trim() ? [{ key: entry.trim(), text: entry.trim(), icon: null, enabled: true }] : [];
    }
    const f = record(entry);
    const label = text(f.text) || text(f.title) || text(f.label) || text(f.name);
    if (!label || f.enabled === false) return [];
    return [{ key: text(f.key) || label, text: label, icon: text(f.icon) || null, enabled: true }];
  }) : [];
  return { icon, badge, features };
}

export function parseSubscriptionPlans(input: unknown): SubscriptionPlan[] {
  const value = unwrap(input);
  const items: unknown[] = Array.isArray(value)
    ? value
    : Array.isArray(record(value).results)
      ? (record(value).results as unknown[])
      : [];
  return items.flatMap((entry) => {
    const value = record(entry);
    const id = integer(value.id);
    if (id <= 0) return [];
    const price = amount(value.price);
    const oldPrice = positiveOrNull(value.oldPrice);
    const discountPercent = positiveOrNull(value.discountPercent);
    return [
      {
        id,
        code: text(value.code, `PLAN_${id}`),
        name: text(value.name),
        description: text(value.description),
        presentation: parsePlanPresentation(value.presentation),
        periods: parsePlanPeriods(value.periods, { price, oldPrice, discountPercent }),
        price,
        oldPrice,
        discountPercent,
        durationDays: nullableInteger(value.durationDays),
        maxOrganizations: nullableInteger(value.maxOrganizations),
        maxClients: nullableInteger(value.maxClients),
        monthlySmsLimit: nullableInteger(value.monthlySmsLimit),
        telegramBotEnabled: bool(value.telegramBotEnabled),
        blacklistEnabled: bool(value.blacklistEnabled),
        transactionSmsEnabled: bool(value.transactionSmsEnabled),
        prioritySupportEnabled: bool(value.prioritySupportEnabled),
        stateId: integer(value.stateId),
        createdDate: text(value.createdDate),
        updatedDate: nullableText(value.updatedDate),
      },
    ];
  });
}

export function parseSmsPackages(input: unknown): SmsPackage[] {
  const value = unwrap(input);
  const items: unknown[] = Array.isArray(value)
    ? value
    : Array.isArray(record(value).results)
      ? (record(value).results as unknown[])
      : [];
  return items.flatMap((entry) => {
    const value = record(entry);
    const id = integer(value.id);
    if (id <= 0) return [];
    return [
      {
        id,
        code: text(value.code, `SMS_${id}`),
        name: text(value.name, `${Math.max(0, integer(value.smsCount))} SMS`),
        smsCount: Math.max(0, integer(value.smsCount)),
        price: amount(value.price),
        oldPrice: positiveOrNull(value.oldPrice),
        discountPercent: positiveOrNull(value.discountPercent),
        stateId: integer(value.stateId),
        createdDate: text(value.createdDate),
        updatedDate: nullableText(value.updatedDate),
      },
    ];
  });
}
