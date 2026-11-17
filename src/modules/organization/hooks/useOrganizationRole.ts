import { useMemo } from "react";

import { useAuth } from "../../../context/AuthContext";
import { getCurrentOrganizationRole, type OrganizationRole } from "../utils/organizationRole";

export interface OrganizationRoleState {
  role: OrganizationRole;
  /** Deleting customers, reports, shop and SMS settings, staff, history, plans. */
  isOwner: boolean;
  isStaff: boolean;
  /** For staff: whose shop this is. */
  ownerName: string | null;
  organizationName: string | null;
}

/** The user's role in the shop that is open: what the screens offer them. */
export function useOrganizationRole(): OrganizationRoleState {
  const { user, currentOrganization } = useAuth();
  return useMemo(() => {
    const role = getCurrentOrganizationRole(user, currentOrganization);
    return {
      role,
      isOwner: role === "owner",
      isStaff: role === "staff",
      ownerName: currentOrganization?.ownerName ?? null,
      organizationName: currentOrganization?.name ?? null,
    };
  }, [currentOrganization, user]);
}
