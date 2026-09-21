import { apiClient } from "./axiosService";
import {
  AuthResponse,
  GoogleLoginRequest,
  LogoutRequest,
  OrganizationSelectResponse,
  PhoneAuthConfirmRequest,
  PhoneAuthRequest,
  PhoneAuthRequestResponse,
} from "../modules/auth/types";

export async function googleAccount(payload: GoogleLoginRequest) {
  const { data } = await apiClient.post<AuthResponse>("/account/google", payload);
  return data;
}

export async function linkGoogleProfile(payload: GoogleLoginRequest) {
  const { data } = await apiClient.put<AuthResponse>(
    "/account/profile/google",
    payload,
  );
  return data;
}

export async function linkAppleProfile(payload: { identityToken: string }) {
  const { data } = await apiClient.put<AuthResponse>(
    "/account/profile/apple",
    payload,
  );
  return data;
}

export async function requestPhoneAuthCode(payload: PhoneAuthRequest) {
  const { data } = await apiClient.post<PhoneAuthRequestResponse>(
    "/account/phone/request",
    payload,
  );
  return data;
}

export async function confirmPhoneAuth(payload: PhoneAuthConfirmRequest) {
  const { data } = await apiClient.post<AuthResponse>(
    "/account/phone/confirm",
    payload,
  );
  return data;
}

export async function requestProfilePhoneCode(payload: PhoneAuthRequest) {
  const { data } = await apiClient.post<PhoneAuthRequestResponse>(
    "/account/profile/phone/request",
    payload,
  );
  return data;
}

export async function confirmProfilePhone(payload: PhoneAuthConfirmRequest) {
  const { data } = await apiClient.post<AuthResponse>(
    "/account/profile/phone/confirm",
    payload,
  );
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
