import { apiClient } from "../../../services/axiosService";
import { parseSmsDevice, parseSmsDevices } from "../utils/deviceParsing";
import type { ClaimSmsDevicePayload } from "../types/devices";
export async function getSmsDevices(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/sms/devices", { signal });
  return parseSmsDevices(data);
}
export async function claimSmsDevice(payload: ClaimSmsDevicePayload) {
  const code = payload.code.trim();
  if (!code) throw new Error("SMS Gateway kodini kiriting");
  const body = { code, ...(payload.name?.trim() ? { name: payload.name.trim() } : {}) };
  const { data } = await apiClient.post<unknown>("/sms/devices/claim", body);
  return parseSmsDevice(data);
}
export async function deleteSmsDevice(code: string) {
  if (!code.trim()) throw new Error("SMS qurilma kodi mavjud emas");
  await apiClient.delete("/sms/devices/" + encodeURIComponent(code.trim()));
}
