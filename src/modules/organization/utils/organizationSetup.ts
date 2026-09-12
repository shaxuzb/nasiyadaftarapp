import type { OrganizationRequest } from "../types";

/**
 * Builds the minimal payload required by the first-login organization setup.
 * Optional organization metadata is completed later from the profile flow.
 */
export function buildOrganizationSetupPayload(
  name: string,
): OrganizationRequest | null {
  const normalizedName = name.trim();

  if (!normalizedName) return null;

  return {
    name: normalizedName,
    address: "",
    note: "",
  };
}
