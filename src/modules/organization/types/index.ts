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
  /** "owner" or "staff" (see organizationRole); absent from an older server. */
  role?: string;
  /** For a shop the user works in as staff: its owner's name. */
  ownerName?: string | null;
  /**
   * The plan no longer covers this shop (only the first opened one works on the
   * free plan): everything can be looked at, nothing written. Absent: works.
   */
  isReadOnly?: boolean;
  roleId?: number;
  isSelected?: boolean;
}

export interface SelectOrganizationRequest {
  organizationId: number;
}

export interface BlacklistSettingsRequest {
  blacklistAfterDays: number;
}
