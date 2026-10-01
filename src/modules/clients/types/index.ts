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
}

/** What the add-customer form hands to the client list. */
export type NewCustomerInput = Omit<Customer, "id" | "createdAt"> &
  Pick<ClientCreateRequest, "initialBalance" | "initialBalanceDate">;

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
