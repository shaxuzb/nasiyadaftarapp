import { AuthResponse } from "../types";

export function isAuthResponse(data: unknown): data is AuthResponse {
  if (!data || typeof data !== "object") return false;
  const candidate = data as AuthResponse;
  return Boolean(candidate.token && candidate.refreshToken && candidate.user);
}
