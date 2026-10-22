export type SmsProviderCode = "system" | "own_device";

export interface SmsProvider {
  provider: SmsProviderCode;
  usesQuota: boolean;
  ownDeviceAllowed: boolean;
}
