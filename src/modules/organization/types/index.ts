export const MAX_ORGANIZATIONS_PER_USER = 1;

export interface OrganizationRequest {
  name: string;
  address: string;
  note: string;
  /** Present only when the user agreed to the public offer; never false. */
  offerAccepted?: true;
  /** The book's currency ("USD"); the server takes UZS when it is left out. */
  currencyCode?: string;
}

export interface UpdateCurrentOrganizationRequest {
  name: string;
  address: string;
}

export interface OrganizationResponse {
  id: number;
  name: string;
  address?: string | null;
  note?: string | null;
  blacklistAfterDays?: number;
  stateId?: number;
  state?: string;
  createdDate?: string;
  clientCount?: number;
  userCount?: number;
  /** The currency every debt and payment of this organization is in ("UZS", "USD"…). */
  currencyCode?: string;
}

export interface OrganizationMembership extends OrganizationResponse {
  role?: string;
  roleId?: number;
  isSelected?: boolean;
}

export interface SelectOrganizationRequest {
  organizationId: number;
}

export interface BlacklistSettingsRequest {
  blacklistAfterDays: number;
}
