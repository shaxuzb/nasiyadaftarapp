import type {
  CurrentSubscription,
  SmsPackage,
  SubscriptionPlan,
  SubscriptionSmsQuota,
} from "../types";

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
    planName: text(value.planName, "Bepul"),
    price: amount(value.price),
    startAt: text(value.startAt),
    endAt: nullableText(value.endAt),
    source: text(value.source, "system"),
    provider: nullableText(value.provider),
    maxOrganizations,
    maxClients,
    unlimitedOrganizations:
      bool(value.unlimitedOrganizations) || maxOrganizations === null,
    unlimitedClients: bool(value.unlimitedClients) || maxClients === null,
    telegramBotEnabled: bool(value.telegramBotEnabled),
    blacklistEnabled: bool(value.blacklistEnabled),
    sms: parseQuota(value.sms),
  };
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
    return [
      {
        id,
        code: text(value.code, `PLAN_${id}`),
        name: text(value.name, "Tarif"),
        description: text(value.description),
        price: amount(value.price),
        durationDays: nullableInteger(value.durationDays),
        maxOrganizations: nullableInteger(value.maxOrganizations),
        maxClients: nullableInteger(value.maxClients),
        monthlySmsLimit: nullableInteger(value.monthlySmsLimit),
        telegramBotEnabled: bool(value.telegramBotEnabled),
        blacklistEnabled: bool(value.blacklistEnabled),
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
        stateId: integer(value.stateId),
        createdDate: text(value.createdDate),
        updatedDate: nullableText(value.updatedDate),
      },
    ];
  });
}
