import type { OrganizationRequest } from "../types";

/**
 * Builds the minimal payload required by the first-login organization setup.
 * Optional organization metadata is completed later from the profile flow.
 */
export function buildOrganizationSetupPayload(
  name: string,
  offerAccepted = false,
): OrganizationRequest | null {
  const normalizedName = name.trim();

  if (!normalizedName) return null;

  return {
    name: normalizedName,
    address: "",
    note: "",
    // Sent only as an agreement. Without one the field is left out, and the
    // server decides whether the organization may be created.
    ...(offerAccepted ? { offerAccepted: true as const } : {}),
  };
}
