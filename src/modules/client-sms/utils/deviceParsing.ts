import type { SmsDevice, SmsDeviceSim } from "../types/devices";
const obj = (v: unknown): Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const str = (v: unknown): string => typeof v === "string" ? v : "";
const num = (v: unknown): number => typeof v === "number" && Number.isFinite(v) ? v : 0;
export function parseSmsDevice(input: unknown): SmsDevice {
  const data = obj(input);
  if (!str(data.deviceCode)) throw new Error("SMS qurilma kodi mavjud emas");
  if (!Array.isArray(data.sims)) throw new Error("SMS SIM ro'yxati noto'g'ri");
  const sims: SmsDeviceSim[] = data.sims.map((v: unknown) => {
    const sim = obj(v);
    return {
      id: num(sim.id), deviceCode: str(sim.deviceCode), slot: num(sim.slot),
      name: str(sim.name), organizationId: num(sim.organizationId),
      organizationName: str(sim.organizationName), dailyLimit: num(sim.dailyLimit),
      usedToday: num(sim.usedToday), remainingToday: num(sim.remainingToday),
      isActive: sim.isActive === true,
    };
  });
  return {
    deviceCode: str(data.deviceCode), name: str(data.name),
    online: typeof data.online === "boolean" ? data.online : null,
    canSend: typeof data.canSend === "boolean" ? data.canSend : null,
    unavailableReason: typeof data.unavailableReason === "string" && data.unavailableReason.trim() ? data.unavailableReason.trim() : null,
    battery: typeof data.battery === "number" && Number.isFinite(data.battery) ? data.battery : null,
    lastSeenAt: typeof data.lastSeenAt === "string" ? data.lastSeenAt : null,
    sims,
  };
}
export function parseSmsDevices(input: unknown): SmsDevice[] {
  if (!Array.isArray(input)) throw new Error("SMS qurilmalar ro'yxati noto'g'ri");
  return input.map(parseSmsDevice);
}
