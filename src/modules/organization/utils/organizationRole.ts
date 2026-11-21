/**
 * Who the user is in a shop: its owner ("Biznes egasi"), who can do
 * everything, or staff ("Xodim") the owner added, who works with customers,
 * debts and SMS only. A server that sends no role (an older one) means owner,
 * as everyone was before staff existed. Pure: tested on its own.
 */

export type OrganizationRole = "owner" | "staff";

export function normalizeOrganizationRole(value: unknown): OrganizationRole | undefined {
  if (typeof value !== "string") return undefined;
  const role = value.trim().toLowerCase();
  return role === "staff" || role === "owner" ? role : undefined;
}

interface RoleUser {
  organizationId?: number | null;
  currentOrganizationRole?: string | null;
}

interface RoleOrganization {
  id: number;
  role?: string;
}

/** The user's role in the shop that is open. */
export function getCurrentOrganizationRole(
  user: RoleUser | null | undefined,
  organization: RoleOrganization | null | undefined,
): OrganizationRole {
  // The select answer names the role for the shop it selected; the list
  // names one per shop. Either will do, the select answer when it is this shop.
  const fromUser =
    !organization || user?.organizationId === organization.id
      ? normalizeOrganizationRole(user?.currentOrganizationRole)
      : undefined;
  return fromUser ?? normalizeOrganizationRole(organization?.role) ?? "owner";
}

/** The user's own shops: only these count against their plan's shop limit. */
export function countOwnOrganizations(organizations: readonly RoleOrganization[]): number {
  return organizations.filter((item) => normalizeOrganizationRole(item.role) !== "staff").length;
}
