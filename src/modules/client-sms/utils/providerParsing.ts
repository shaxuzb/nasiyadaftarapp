import type { SmsProvider, SmsProviderCode } from "../types/provider";

const record = (data: unknown): Record<string, unknown> =>
  data !== null && typeof data === "object" && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};

export function parseSmsProvider(input: unknown): SmsProvider {
  const outer = record(input);
  const value = record(outer.data);
  const raw = Object.keys(value).length ? value : outer;
  if ((raw.provider !== "system" && raw.provider !== "own_device") ||
      typeof raw.usesQuota !== "boolean" || typeof raw.ownDeviceAllowed !== "boolean") {
    throw new Error("SMS provider javobi noto'g'ri");
  }
  return {
    provider: raw.provider as SmsProviderCode,
    usesQuota: raw.usesQuota,
    ownDeviceAllowed: raw.ownDeviceAllowed,
  };
}
