export type TransactionType = "debt" | "payment";

export interface Transaction {
  id: number;
  customerId: number;
  type: TransactionType;
  amount: number;
  date: string;
  note?: string;
}

export interface ClientTransactionDto {
  id?: number | string;
  clientId?: number | string;
  type: string;
  amount: number;
  date: string;
  note?: string;
}

export interface ClientTransactionCreateRequest {
  type: TransactionType;
  amount: number;
  date: string;
  note: string;
}
