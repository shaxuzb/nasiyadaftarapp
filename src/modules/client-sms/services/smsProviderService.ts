import { apiClient } from "../../../services/axiosService";
import { parseSmsProvider } from "../utils/providerParsing";
import type { SmsProviderCode } from "../types/provider";

export async function getSmsProvider(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/sms/provider", { signal });
  return parseSmsProvider(data);
}

export async function updateSmsProvider(provider: SmsProviderCode) {
  if (provider !== "system" && provider !== "own_device") {
    throw new Error("SMS yuborish usuli noto'g'ri");
  }
  const { data } = await apiClient.put<unknown>("/sms/provider", { provider });
  return parseSmsProvider(data);
}
