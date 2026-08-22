import { apiClient } from "./axiosService";
import {
  OrganizationMembership,
  OrganizationRequest,
  OrganizationResponse,
} from "../modules/organization/types";

function extractOrganization(data: unknown): OrganizationResponse | null {
  if (!data) return null;

  if (typeof data === "object") {
    const direct = data as OrganizationResponse;
    if (typeof direct.id !== "undefined" && direct.name) {
      return direct;
    }

    const wrapped = data as Record<string, unknown>;
    if (wrapped.data && typeof wrapped.data === "object") {
      const nested = wrapped.data as OrganizationResponse;
      if (typeof nested.id !== "undefined" && nested.name) {
        return nested;
      }
    }

    if (wrapped.result && typeof wrapped.result === "object") {
      const nested = wrapped.result as OrganizationResponse;
      if (typeof nested.id !== "undefined" && nested.name) {
        return nested;
      }
    }
  }

  return null;
}

export async function createOrganization(payload: OrganizationRequest): Promise<OrganizationResponse | null> {
  const { data } = await apiClient.post<unknown>("/organizations", payload);
  return extractOrganization(data);
}

export async function getCurrentOrganization(): Promise<OrganizationResponse | null> {
  const { data } = await apiClient.get<unknown>("/organizations/current");
  return extractOrganization(data);
}

function parseOrganizationMembership(
  value: unknown,
  index: number,
): OrganizationMembership {
  if (!value || typeof value !== "object") {
    throw new Error(`Tashkilot ${index + 1} noto'g'ri formatda qaytdi`);
  }

  const item = value as Record<string, unknown>;
  const id = Number(item.id);
  const name = typeof item.name === "string" ? item.name.trim() : "";
  if (!Number.isInteger(id) || id <= 0 || !name) {
    throw new Error(`Tashkilot ${index + 1} ma'lumotlari to'liq emas`);
  }

  return {
    id,
    name,
    address: typeof item.address === "string" ? item.address : null,
    note: typeof item.note === "string" ? item.note : null,
    role: typeof item.role === "string" ? item.role : undefined,
    roleId:
      typeof item.roleId === "number" && Number.isInteger(item.roleId)
        ? item.roleId
        : undefined,
    isSelected: typeof item.isSelected === "boolean" ? item.isSelected : undefined,
  };
}

function extractOrganizations(data: unknown): OrganizationMembership[] {
  let items: unknown[] | null = null;
  if (Array.isArray(data)) {
    items = data;
  }

  if (!items && data && typeof data === "object") {
    const wrapped = data as Record<string, unknown>;
    for (const key of ["data", "result", "items", "results"]) {
      if (Array.isArray(wrapped[key])) {
        items = wrapped[key];
        break;
      }
    }
  }

  if (!items) {
    throw new Error("Tashkilotlar ro'yxati noto'g'ri formatda qaytdi");
  }
  return items.map(parseOrganizationMembership);
}

export async function getManualOrganizations(): Promise<OrganizationMembership[]> {
  const { data } = await apiClient.get<unknown>("/manual/organizations");
  return extractOrganizations(data);
}
