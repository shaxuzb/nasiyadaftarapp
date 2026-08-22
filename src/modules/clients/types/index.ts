export interface Customer {
  id: number;
  fullName: string;
  phone: string;
  note?: string;
  createdAt?: string;
  currentBalance?: number;
}

export interface ClientCreateRequest {
  fullName: string;
  phoneNumber: string;
  note: string;
}

export interface ClientDto {
  id: number | string;
  fullName: string;
  phoneNumber: string;
  note?: string;
  currentBalance?: number | string;
  createdDate?: string;
}
