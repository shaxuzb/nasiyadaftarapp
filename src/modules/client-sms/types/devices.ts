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
}
export interface ClaimSmsDevicePayload { code: string; name?: string }
