export interface BlacklistedOrganization {
  id?: number;
  name: string;
}

export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  note?: string;
  createdAt?: string;
  currentBalance?: number;
  isBlacklisted?: boolean;
  overdueBalance?: number;
  blacklistedOrganizationCount?: number;
  blacklistedOrganizations?: BlacklistedOrganization[];
}

export interface ClientCreateRequest {
  fullName: string;
  phoneNumber: string;
  note: string;
}

export type ClientUpdateRequest = ClientCreateRequest;

export interface ClientDto {
  id: number | string;
  fullName: string;
  phoneNumber: string;
  note?: string;
  currentBalance?: number | string;
  createdDate?: string;
  isBlacklisted?: boolean;
  overdueBalance?: number | string;
  blacklistedOrganizationCount?: number | string;
  blacklistedOrganizations?: unknown;
}
