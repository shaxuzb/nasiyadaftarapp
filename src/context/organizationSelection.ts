export type OrganizationSelectionBackAction<T> =
  | { type: "restore"; organization: T }
  | { type: "logout" };

export function getOrganizationSelectionBackAction<T>(
  organization: T | null,
): OrganizationSelectionBackAction<T> {
  return organization
    ? { type: "restore", organization }
    : { type: "logout" };
}
