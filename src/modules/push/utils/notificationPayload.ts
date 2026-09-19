export function parseNotificationId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getNotificationIdFromData(
  data: Record<string, unknown> | undefined,
): number | null {
  return parseNotificationId(data?.notificationId);
}
