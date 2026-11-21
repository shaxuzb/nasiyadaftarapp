import { apiClient } from "../../../services/axiosService";
import {
  parseDeletedClientDetail,
  parseDeletedClients,
  parseOrganizationChanges,
  parsePurchases,
} from "../utils/historyParsing";

export const HISTORY_PAGE_SIZE = 20;

interface PageParams {
  page: number;
  search?: string;
}

function params({ page, search }: PageParams) {
  return { page, pageSize: HISTORY_PAGE_SIZE, ...(search ? { search } : {}) };
}

export async function getDeletedClients(input: PageParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/history/deleted-clients", {
    params: params(input),
    signal,
  });
  return parseDeletedClients(data);
}

export async function getDeletedClient(id: number, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(`/history/deleted-clients/${id}`, { signal });
  const detail = parseDeletedClientDetail(data);
  if (!detail) throw new Error("Deleted client response could not be read");
  return detail;
}

export async function getPurchases(input: PageParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/history/purchases", {
    params: params(input),
    signal,
  });
  return parsePurchases(data);
}

export async function getOrganizationChanges(input: PageParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>("/history/organization", {
    params: params(input),
    signal,
  });
  return parseOrganizationChanges(data);
}
