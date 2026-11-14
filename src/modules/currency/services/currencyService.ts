import { apiClient } from "../../../services/axiosService";
import { parseCurrencies, type Currency } from "../data/currencies";

/** The currencies on offer (no sign-in needed). */
export async function getCurrencies(signal?: AbortSignal): Promise<Currency[]> {
  const { data } = await apiClient.get<unknown>("/currencies", { signal });
  return parseCurrencies(data);
}
