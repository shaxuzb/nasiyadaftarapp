export interface BlacklistedOrganization {
  id?: number;
  name: string;
  /** The day the customer was blacklisted there, "YYYY-MM-DD". */
  blacklistedSince?: string;
  /** That organization's own limit: days overdue before it blacklists. */
  blacklistAfterDays?: number;
}

export interface Customer {
  /** The server's id; negative for a customer added offline and not yet sent. */
  id: number;
  /** The id the phone and the server share (offline sync). */
  uuid?: string;
  /** Written on the phone and not yet on the server (offline sync). */
  pendingSync?: boolean;
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

export interface ClientUpdateRequest {
  fullName: string;
  phoneNumber: string;
  note: string;
}

export interface ClientCreateRequest extends ClientUpdateRequest {
  /**
   * A balance the customer already carries when they are added: positive means
   * they owe it, negative that they paid in advance. Omitted or 0, the backend
   * records nothing.
   */
  initialBalance?: number;
  /**
   * The day that balance dates from, "YYYY-MM-DD"; today when omitted.
   * Blacklisting counts overdue days from here, so an old debt needs its real
   * date rather than the day it was typed in.
   */
  initialBalanceDate?: string;
  /** Written once by the phone: the server never records the same uuid twice. */
  uuid?: string;
}

/** What the add-customer form hands to the client list. */
export type NewCustomerInput = Omit<Customer, "id" | "createdAt"> &
  Pick<ClientCreateRequest, "initialBalance" | "initialBalanceDate">;

export interface ClientDto {
  id: number | string;
  uuid?: string;
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
