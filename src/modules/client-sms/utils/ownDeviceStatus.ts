import type { SmsDevice } from "../types/devices";

/**
 * What the SMS screen says about the shop's own phone, in one line. Read off
 * GET /sms/devices: the phone, whether it is reachable, and how many more
 * numbers its SIMs may text today (each SIM has a daily limit of its own).
 */
export type OwnDeviceStatus =
  | { kind: "notConnected" }
  | { kind: "blocked"; reason: string | null; online: boolean | null }
  | { kind: "offline" }
  | { kind: "limitReached"; online: boolean | null }
  | { kind: "ready"; remainingToday: number | null; online: boolean | null };

export function getOwnDeviceStatus(devices: readonly SmsDevice[] | undefined): OwnDeviceStatus {
  // The settings screen manages one phone, the first; so does this.
  const device = devices?.[0];
  if (!device) return { kind: "notConnected" };
  if (device.canSend === false) {
    return { kind: "blocked", reason: device.unavailableReason, online: device.online };
  }
  if (device.online === false) return { kind: "offline" };

  // A switched-off SIM sends nothing. No SIM reported at all means the count
  // is unknown, which is not the same as none left.
  if (device.sims.length === 0) return { kind: "ready", remainingToday: null, online: device.online };
  const remainingToday = device.sims
    .filter((sim) => sim.isActive)
    .reduce((total, sim) => total + Math.max(0, sim.remainingToday), 0);
  return remainingToday === 0
    ? { kind: "limitReached", online: device.online }
    : { kind: "ready", remainingToday, online: device.online };
}
