import { apiClient } from "../../../services/axiosService";
import type {
  PushDevicePayload,
  PushNotification,
  PushNotificationListParams,
  PushNotificationPage,
} from "../types";

function normalizeNotification(value: unknown): PushNotification | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const id = typeof item.id === "number" ? item.id : Number(item.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  return {
    id,
    title: typeof item.title === "string" ? item.title : "",
    body: typeof item.body === "string" ? item.body : "",
    createdDate:
      typeof item.createdDate === "string" ? item.createdDate : "",
    isRead: item.isRead === true,
  };
}

function normalizePage(value: unknown): PushNotificationPage {
  if (!value || typeof value !== "object") {
    return { count: 0, results: [] };
  }

  const data = value as Record<string, unknown>;
  const rawResults = Array.isArray(data.results) ? data.results : [];
  const results = rawResults
    .map(normalizeNotification)
    .filter((item): item is PushNotification => item !== null);
  const count = Number(data.count);

  return {
    count: Number.isFinite(count) && count >= 0 ? count : results.length,
    results,
  };
}

export async function registerPushDevice(
  payload: PushDevicePayload,
): Promise<void> {
  await apiClient.put("/push/devices", payload);
}

export async function unregisterPushDevice(
  installationId: string,
): Promise<void> {
  await apiClient.delete(`/push/devices/${encodeURIComponent(installationId)}`);
}

export async function getPushNotifications(
  params: PushNotificationListParams,
  signal?: AbortSignal,
): Promise<PushNotificationPage> {
  const { data } = await apiClient.get<unknown>("/push/notifications", {
    signal,
    params: {
      page: params.page,
      pageSize: params.pageSize,
    },
  });
  return normalizePage(data);
}

export async function getUnreadPushNotificationCount(
  signal?: AbortSignal,
): Promise<number> {
  const { data } = await apiClient.get<unknown>(
    "/push/notifications/unread-count",
    { signal },
  );
  const count =
    data && typeof data === "object"
      ? Number((data as Record<string, unknown>).count)
      : 0;
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export async function markPushNotificationRead(id: number): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Bildirishnoma ID noto'g'ri");
  }
  await apiClient.post(`/push/notifications/${id}/read`);
}
