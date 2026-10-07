export function parseNotificationId(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** A usable `link` value, or null when there is none. */
export function parseNotificationLinkValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const link = value.trim();
  return link ? link : null;
}

export function getNotificationLinkFromData(
  data: Record<string, unknown> | undefined,
): string | null {
  return parseNotificationLinkValue(data?.link);
}

export function getNotificationIdFromData(
  data: Record<string, unknown> | undefined,
): number | null {
  return parseNotificationId(data?.notificationId);
}
