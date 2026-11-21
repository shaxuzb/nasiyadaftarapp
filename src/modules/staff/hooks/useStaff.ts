import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../context/AuthContext";
import { getOrganizationQueryScope } from "../../../core/query/organizationScope";
import { queryKeys } from "../../../core/query/queryKeys";
import { addStaff, cancelStaffInvite, getStaff, removeStaff } from "../services/staffService";
import type { StaffList } from "../utils/staffParsing";

function useStaffKey() {
  const { user, currentOrganization } = useAuth();
  const organization = getOrganizationQueryScope(user?.id, currentOrganization?.id);
  return { key: queryKeys.staff(organization.scope), enabled: organization.enabled };
}

export function useStaffList() {
  const { key, enabled } = useStaffKey();
  return useQuery({
    queryKey: key,
    queryFn: ({ signal }) => getStaff(signal),
    enabled,
    staleTime: 0,
  });
}

/** Each change answers with the list as it now is: it replaces the cache. */
export function useStaffMutations() {
  const queryClient = useQueryClient();
  const { key } = useStaffKey();
  const put = (list: StaffList) => queryClient.setQueryData(key, list);

  const add = useMutation({
    mutationFn: (phoneNumber: string) => addStaff(phoneNumber),
    onSuccess: (result) => put(result.staff),
  });
  const remove = useMutation({
    mutationFn: (userId: number) => removeStaff(userId),
    onSuccess: put,
  });
  const cancelInvite = useMutation({
    mutationFn: (inviteId: number) => cancelStaffInvite(inviteId),
    onSuccess: put,
  });
  return { add, remove, cancelInvite };
}
