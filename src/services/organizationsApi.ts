import { apiClient } from "./axiosService";
import {
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
