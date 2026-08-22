import { apiClient } from "./axiosService";
import {
  AuthResponse,
  GoogleLoginRequest,
  LoginRequest,
  LogoutRequest,
  OrganizationSelectResponse,
  RegisterRequest,
} from "../modules/auth/types";

export interface AccountChangeResponse {
  user?: Partial<AuthResponse["user"]>;
  email?: string | null;
}

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

export async function selectOrganizationAccount(organizationId: number) {
  const { data } = await apiClient.post<OrganizationSelectResponse>(
    "/account/select-organization",
    { organizationId },
  );
  return data;
}

export async function requestPasswordChange(payload: { delivery: string }) {
  await apiClient.post("/account/password-change/request", payload);
}

export async function confirmPasswordChange(payload: {
  delivery: string;
  code: string;
  newPassword: string;
}) {
  await apiClient.post("/account/password-change/confirm", payload);
}

export async function requestPhoneChange(payload: { phoneNumber: string }) {
  await apiClient.post("/account/phone-change/request", payload);
}

export async function confirmPhoneChange(payload: {
  phoneNumber: string;
  code: string;
}) {
  await apiClient.post("/account/phone-change/confirm", payload);
}

export async function requestGoogleChange(payload: { idToken: string }) {
  await apiClient.post("/account/google-change/request", payload);
}

export async function confirmGoogleChange(payload: {
  idToken: string;
  code: string;
}) {
  const { data } = await apiClient.post<AccountChangeResponse | undefined>(
    "/account/google-change/confirm",
    payload,
  );
  return data;
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
