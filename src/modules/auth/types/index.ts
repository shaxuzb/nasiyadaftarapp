export interface AuthUser {
  id: number;
  userName: string;
  phoneNumber: string;
  fullName: string;
  authProvider?: string;
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
}

export interface RegisterRequest {
  userName: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

export interface LoginRequest {
  userName: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
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
  token: string;
  refreshToken: string;
}

export interface AuthSession extends AuthResponse {
  uniqueId: string;
}
