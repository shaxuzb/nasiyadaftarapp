export type OrganizationQueryScope = number | "no-organization";

type OrganizationQueryState = {
  scope: OrganizationQueryScope;
  enabled: boolean;
};

function isPositiveFiniteId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function getOrganizationQueryScope(
  userId?: number | null,
  organizationId?: number | null,
): OrganizationQueryState {
  const hasOrganization = isPositiveFiniteId(organizationId);

  return {
    scope: hasOrganization ? organizationId : "no-organization",
    enabled: isPositiveFiniteId(userId) && hasOrganization,
  };
}
