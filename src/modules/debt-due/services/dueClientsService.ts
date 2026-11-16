import { apiClient } from "../../../services/axiosService";
import { parseDueClients, type DueClient } from "../utils/dueClients";

/** Customers whose debt is due on `date` ("YYYY-MM-DD"); today when omitted. */
export async function getDueClients(date?: string, signal?: AbortSignal): Promise<DueClient[]> {
  const { data } = await apiClient.get<unknown>("/clients/due", {
    params: date ? { date } : undefined,
    signal,
  });
  return parseDueClients(data);
}
