import { apiClient } from "./axiosService";
import { Customer } from "../modules/clients/types";
import { Transaction, TransactionType } from "../modules/transactions/types";
import {
  ClientCreateRequest,
  ClientDto,
} from "../modules/clients/types";
import {
  ClientTransactionCreateRequest,
  ClientTransactionDto,
} from "../modules/transactions/types";

function toNumber(value: number | string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTransactionType(type: string | undefined): TransactionType {
  const normalized = (type ?? "").trim().toLowerCase();
  if (normalized.includes("pay") || normalized.includes("tol")) {
    return "payment";
  }
  return "debt";
}

function mapClient(dto: ClientDto): Customer {
  return {
    id: toNumber(dto.id, Date.now()),
    firstName: dto.firstName ?? "",
    lastName: dto.lastName ?? "",
    phone: dto.phoneNumber ?? "",
    note: dto.note ?? "",
    createdAt: dto.createdDate,
    currentBalance: Number(dto.currentBalance ?? 0),
  };
}

function mapTransaction(
  dto: Partial<ClientTransactionDto>,
  fallbackClientId: number,
  fallbackId: number,
  fallbackType: TransactionType,
  fallbackPayload: { amount: number; date: string; note: string },
): Transaction {
  return {
    id: toNumber(dto.id, fallbackId),
    customerId: toNumber(dto.clientId, fallbackClientId),
    type: dto.type ? normalizeTransactionType(dto.type) : fallbackType,
    amount: Number(dto.amount ?? fallbackPayload.amount),
    date: dto.date ?? fallbackPayload.date,
    note: dto.note ?? fallbackPayload.note,
  };
}

function extractArray<T>(input: unknown): T[] {
  if (Array.isArray(input)) return input as T[];
  if (input && typeof input === "object") {
    const candidate = input as Record<string, unknown>;
    if (Array.isArray(candidate.results)) return candidate.results as T[];
    if (Array.isArray(candidate.items)) return candidate.items as T[];
    if (Array.isArray(candidate.data)) return candidate.data as T[];
    if (Array.isArray(candidate.result)) return candidate.result as T[];
  }
  return [];
}

function extractClient(input: unknown): ClientDto | null {
  if (!input || typeof input !== "object") return null;

  const candidate = input as Record<string, unknown>;

  if (typeof candidate.id !== "undefined") {
    return candidate as unknown as ClientDto;
  }

  if (candidate.data && typeof candidate.data === "object") {
    const nested = candidate.data as Record<string, unknown>;
    if (typeof nested.id !== "undefined") {
      return nested as unknown as ClientDto;
    }
  }

  if (candidate.result && typeof candidate.result === "object") {
    const nested = candidate.result as Record<string, unknown>;
    if (typeof nested.id !== "undefined") {
      return nested as unknown as ClientDto;
    }
  }

  return null;
}

export async function getClients(search?: string): Promise<Customer[]> {
  const { data } = await apiClient.get<unknown>("/clients", {
    params: search?.trim() ? { search: search.trim() } : undefined,
  });

  return extractArray<ClientDto>(data).map(mapClient);
}

export async function getClientById(id: number): Promise<Customer> {
  const { data } = await apiClient.get<unknown>(`/clients/${id}`);
  const extracted = extractClient(data);
  if (!extracted) {
    throw new Error("Client parsing error");
  }
  return mapClient(extracted);
}

export async function createClient(
  payload: ClientCreateRequest,
): Promise<Customer> {
  const { data } = await apiClient.post<unknown>("/clients", payload);
  const extracted = extractClient(data);

  if (extracted) {
    return mapClient(extracted);
  }

  const fallbackList = await getClients(payload.phoneNumber);
  const matched = fallbackList.find(
    (item) =>
      item.phone === payload.phoneNumber &&
      item.firstName === payload.firstName &&
      item.lastName === payload.lastName,
  );

  if (matched) {
    return matched;
  }

  throw new Error("Created client not returned from API");
}

export async function deleteClient(id: number): Promise<void> {
  await apiClient.delete(`/clients/${id}`);
}

export async function createClientTransaction(
  clientId: number,
  payload: ClientTransactionCreateRequest,
): Promise<Transaction> {
  const { data } = await apiClient.post<unknown>(
    `/clients/${clientId}/transactions`,
    payload,
  );
  const candidate =
    data && typeof data === "object"
      ? ((data as Record<string, unknown>).data as ClientTransactionDto) ??
        ((data as Record<string, unknown>).result as ClientTransactionDto) ??
        (data as ClientTransactionDto)
      : undefined;

  return mapTransaction(
    candidate ?? {},
    clientId,
    Date.now(),
    payload.type,
    {
      amount: payload.amount,
      date: payload.date,
      note: payload.note,
    },
  );
}

export async function getClientHistory(
  clientId: number,
): Promise<Transaction[]> {
  const { data } = await apiClient.get<unknown>(`/clients/${clientId}/history`);
  const transactions = extractArray<ClientTransactionDto>(data);

  return transactions.map((item, index) =>
    mapTransaction(item, clientId, Date.now() + index, "debt", {
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      note: "",
    }),
  );
}
