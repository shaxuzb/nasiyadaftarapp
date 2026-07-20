import { apiClient } from "./axiosService";
import {
  AuthResponse,
  GoogleLoginRequest,
  LoginRequest,
  LogoutRequest,
  RegisterRequest,
} from "../modules/auth/types";

export async function registerAccount(payload: RegisterRequest) {
  const { data } = await apiClient.post<AuthResponse | Record<string, unknown>>(
    "/account/register",
    payload,
  );
  return data;
}

export async function loginAccount(payload: LoginRequest) {
  const { data } = await apiClient.post<AuthResponse>("/account/login", payload);
  return data;
}

export async function googleAccount(payload: GoogleLoginRequest) {
  const { data } = await apiClient.post<AuthResponse>("/account/google", payload);
  return data;
}

export async function logoutAccount(payload: LogoutRequest) {
  await apiClient.post("/account/logout", payload);
}

export async function requestPasswordReset(payload: { phone: string }) {
  await apiClient.post("/account/password-reset/request", payload);
}

export async function confirmPasswordReset(payload: {
  phone: string;
  code: string;
  newPassword: string;
}) {
  await apiClient.post("/account/password-reset/confirm", payload);
}

export interface SmsSendResponse {
  phoneMasked: string;
  expiresInSeconds: number;
}

export async function sendSmsCode(payload: { phone: string }) {
  const { data } = await apiClient.post<SmsSendResponse>("/sms/send", payload);
  return data;
}

export async function verifySmsCode(payload: { phone: string; code: string }) {
  const { data } = await apiClient.post<{ success: boolean }>("/sms/verify", payload);
  return data;
}
