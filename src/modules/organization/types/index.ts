export interface OrganizationRequest {
  name: string;
  phoneNumber: string;
  address: string;
  note: string;
}

export interface OrganizationResponse {
  id: number;
  name: string;
  phoneNumber: string;
  address?: string | null;
  note?: string | null;
  stateId?: number;
  state?: string;
  createdDate?: string;
  clientCount?: number;
  userCount?: number;
}
