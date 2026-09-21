import { OrganizationMembership } from "../../organization/types";
import type { CurrentSubscription } from "../../subscription/types";

export interface AuthUser {
  id: number;
  userName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  phoneVerified?: boolean;
  fullName: string | null;
  authProvider?: string;
  authMethods?: string[];
  hasPhoneNumber?: boolean;
  hasGoogleAccount?: boolean;
  hasAppleAccount?: boolean;
  organizations?: OrganizationMembership[];
  organizationId?: number | null;
  organizationName?: string | null;
  hasOrganization: boolean;
  role: string;
  roleId: number;
  loginTypeId?: number | null;
  loginTypeCode?: string | null;
  loginType?: string | null;
  state: string;
  stateId: number;
  isParent: boolean;
  modules: Array<number | string>;
  permissions: string[];
  subscription?: CurrentSubscription;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface PhoneAuthRequest {
  phoneNumber: string;
}

export interface PhoneAuthConfirmRequest extends PhoneAuthRequest {
  code: string;
}

export interface PhoneAuthRequestResponse {
  maskedPhone: string;
  expiresInSeconds: number;
}

export interface AppleLoginRequest {
  identityToken: string;
  email?: string | null;
  fullName?: string | null;
}

export interface LogoutRequest {
  refreshToken: string;
  uniqueId: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface AuthRefreshResponse {
  accessToken?: string | null;
  token?: string | null;
  refreshToken?: string | null;
}

export interface OrganizationSelectResponse {
  token?: string;
  refreshToken?: string;
  user?: Partial<AuthUser>;
}

export interface AuthSession extends AuthResponse {
  uniqueId: string;
}
