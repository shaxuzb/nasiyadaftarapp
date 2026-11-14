export type TransactionType = "debt" | "payment";

export interface Transaction {
  /** The server's id; negative for one written offline and not yet sent. */
  id: number;
  customerId: number;
  type: TransactionType;
  amount: number;
  date: string;
  note?: string;
  /** The id the phone and the server share (offline sync). */
  uuid?: string;
  /** Written on the phone and not yet on the server (offline sync). */
  pendingSync?: boolean;
}

export interface ClientTransactionDto {
  id?: number | string;
  uuid?: string;
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
  /** Written once by the phone: the server never records the same uuid twice. */
  uuid?: string;
}
