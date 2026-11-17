import { apiClient } from "../../../services/axiosService";
import { parseStaffAddResult, parseStaffList } from "../utils/staffParsing";

const BASE = "/organizations/current/staff";

export async function getStaff(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>(BASE, { signal });
  return parseStaffList(data);
}

/** By phone number: added at once when they have an account, invited otherwise. */
export async function addStaff(phoneNumber: string) {
  const { data } = await apiClient.post<unknown>(BASE, { phoneNumber });
  return parseStaffAddResult(data);
}

export async function removeStaff(userId: number) {
  const { data } = await apiClient.delete<unknown>(`${BASE}/${userId}`);
  return parseStaffList(data);
}

export async function cancelStaffInvite(inviteId: number) {
  const { data } = await apiClient.delete<unknown>(`${BASE}/invites/${inviteId}`);
  return parseStaffList(data);
}
