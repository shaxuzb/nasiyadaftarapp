import { apiClient } from "../../../services/axiosService";
import type { AppleLoginRequest, AuthResponse } from "../types";

export async function appleAccount(
  payload: AppleLoginRequest,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>("/account/apple", {
    identityToken: payload.identityToken,
  });
  return data;
}
