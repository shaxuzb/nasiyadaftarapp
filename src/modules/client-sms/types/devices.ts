export interface SmsDeviceSim {
  id: number;
  deviceCode: string;
  slot: number;
  name: string;
  organizationId: number;
  organizationName: string;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  isActive: boolean;
}
export interface SmsDevice {
  deviceCode: string;
  name: string;
  online: boolean | null;
  canSend: boolean | null;
  unavailableReason: string | null;
  battery: number | null;
  lastSeenAt: string | null;
  sims: SmsDeviceSim[];
  /**
   * The owner's shops this phone sends SMS for; null from a server that does
   * not share phones between shops yet.
   */
  organizations?: SmsDeviceOrganization[] | null;
}
export interface SmsDeviceOrganization {
  organizationId: number;
  name: string;
  /** The shop it was connected from; another takes over if it is dropped. */
  isPrimary: boolean;
}
export interface ClaimSmsDevicePayload { code: string; name?: string }
