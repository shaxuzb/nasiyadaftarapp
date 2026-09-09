import { apiClient } from "./axiosService";
import { Customer } from "../modules/clients/types";
import { Transaction, TransactionType } from "../modules/transactions/types";
import {
  ClientCreateRequest,
  ClientUpdateRequest,
  ClientDto,
} from "../modules/clients/types";
import {
  ClientTransactionCreateRequest,
  ClientTransactionDto,
} from "../modules/transactions/types";
import { getClientResultCount } from "../modules/clients/utils/clientList";

export interface ClientListResult {
  customers: Customer[];
  count: number;
}

function toNumber(value: number | string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readRequiredId(value: number | string | undefined, entity: string) {
  const id = Number(value);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`Invalid ${entity} id in API response`);
  }
  return id;
}

function normalizeTransactionType(type: string | undefined): TransactionType {
  const normalized = (type ?? "").trim().toLowerCase();
  if (normalized.includes("pay") || normalized.includes("tol")) {
    return "payment";
  }
  return "debt";
}

function mapBlacklistedOrganizations(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.flatMap((value) => {
    if (typeof value === "string" && value.trim()) {
      return [{ name: value.trim() }];
    }
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const nameValue = item.name ?? item.organizationName;
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    if (!name) return [];
    const rawId = item.id ?? item.organizationId;
    const id = Number(rawId);
    return [
      {
        ...(Number.isInteger(id) && id > 0 ? { id } : {}),
        name,
      },
    ];
  });
}

function mapClient(dto: ClientDto): Customer {
  const rawBalance = dto.currentBalance;
  const currentBalance =
    rawBalance === undefined || rawBalance === null
      ? undefined
      : Number(rawBalance);

  return {
    id: readRequiredId(dto.id, "client"),
    fullName: dto.fullName?.trim() ?? "",
    phone: dto.phoneNumber ?? "",
    note: dto.note ?? "",
    createdAt: dto.createdDate,
    // Keep the API value unchanged. Sign inversion is presentation-only.
    currentBalance: Number.isFinite(currentBalance)
      ? currentBalance
      : undefined,
    isBlacklisted: dto.isBlacklisted === true,
    overdueBalance: toNumber(dto.overdueBalance, 0),
    blacklistedOrganizationCount: Math.max(
      0,
      Math.trunc(toNumber(dto.blacklistedOrganizationCount, 0)),
    ),
    blacklistedOrganizations: mapBlacklistedOrganizations(
      dto.blacklistedOrganizations,
    ),
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
  throw new Error("Invalid list response from API");
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

export async function getClientList(
  search?: string,
  signal?: AbortSignal,
): Promise<ClientListResult> {
  const { data } = await apiClient.get<unknown>("/clients", {
    params: search?.trim() ? { search: search.trim() } : undefined,
    signal,
  });

  const clients = extractArray<ClientDto>(data);
  const responseCount =
    data && typeof data === "object"
      ? (data as Record<string, unknown>).count
      : undefined;

  return {
    customers: clients.map(mapClient),
    count: getClientResultCount(responseCount, clients.length),
  };
}

export async function getClients(
  search?: string,
  signal?: AbortSignal,
): Promise<Customer[]> {
  const { customers } = await getClientList(search, signal);
  return customers;
}

export async function getClientById(
  id: number,
  signal?: AbortSignal,
): Promise<Customer> {
  const { data } = await apiClient.get<unknown>(`/clients/${id}`, { signal });
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
      item.fullName.toLowerCase() === payload.fullName.toLowerCase(),
  );

  if (matched) {
    return matched;
  }

  throw new Error("Created client not returned from API");
}

export async function deleteClient(id: number): Promise<void> {
  await apiClient.delete(`/clients/${id}`);
}

export async function updateClient(
  id: number,
  payload: ClientUpdateRequest,
): Promise<void> {
  // The endpoint can return 200 with no body. Do not parse it as a client DTO.
  await apiClient.put(`/clients/${id}`, payload);
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
      ? (((data as Record<string, unknown>).data as ClientTransactionDto) ??
        ((data as Record<string, unknown>).result as ClientTransactionDto) ??
        (data as ClientTransactionDto))
      : undefined;

  return mapTransaction(candidate ?? {}, clientId, Date.now(), payload.type, {
    amount: payload.amount,
    date: payload.date,
    note: payload.note,
  });
}

export async function getClientHistory(
  clientId: number,
  signal?: AbortSignal,
): Promise<Transaction[]> {
  const { data } = await apiClient.get<unknown>(
    `/clients/${clientId}/history`,
    { signal },
  );
  const transactions = extractArray<ClientTransactionDto>(data);

  return transactions.map((item, index) =>
    mapTransaction(item, clientId, Date.now() + index, "debt", {
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      note: "",
    }),
  );
}

/**
 * Loads dashboard history with bounded concurrency. This preserves the
 * current API contract while avoiding an unbounded request burst as the
 * customer list grows.
 */
export async function getClientHistories(
  clientIds: number[],
  concurrency = 6,
): Promise<Transaction[]> {
  const histories: Transaction[][] = [];
  const batchSize = Math.max(1, concurrency);

  for (let index = 0; index < clientIds.length; index += batchSize) {
    const batch = clientIds.slice(index, index + batchSize);
    histories.push(
      ...(await Promise.all(batch.map((id) => getClientHistory(id)))),
    );
  }

  return histories.flat();
}
