export function getAuthDisplayName(
  fullName: string | null | undefined,
): string {
  const normalized = fullName?.trim();
  return normalized || "Foydalanuvchi";
}
