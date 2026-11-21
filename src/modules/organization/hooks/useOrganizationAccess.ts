import { useAuth } from "../../../context/AuthContext";

/**
 * Whether the open shop can be written to. A shop past the plan's limit (the
 * free plan works in the first opened shop only) is "faqat ko'rish": customers,
 * history and reports show as always; adding, editing, deleting, debts and
 * payments, SMS and the shop's settings are hidden. Same for owner and staff.
 */
export function useOrganizationAccess() {
  const { currentOrganization } = useAuth();
  const readOnly = currentOrganization?.isReadOnly === true;
  return { readOnly, canWrite: !readOnly };
}
