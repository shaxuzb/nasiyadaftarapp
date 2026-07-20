export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  note?: string;
  createdAt?: string;
  currentBalance?: number;
}

export interface ClientCreateRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  note: string;
}

export interface ClientDto {
  id: number | string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  note?: string;
  currentBalance?: number;
  createdDate?: string;
}
