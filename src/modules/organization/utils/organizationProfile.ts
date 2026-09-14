import type { UpdateCurrentOrganizationRequest } from "../types";

export type OrganizationProfileNormalizationResult =
  | { ok: true; value: UpdateCurrentOrganizationRequest }
  | { ok: false; reason: "nameRequired" };

export function normalizeOrganizationProfile(
  payload: UpdateCurrentOrganizationRequest,
): OrganizationProfileNormalizationResult {
  const name = payload.name.trim();
  if (!name) return { ok: false, reason: "nameRequired" };

  return {
    ok: true,
    value: {
      name,
      address: payload.address.trim(),
    },
  };
}
