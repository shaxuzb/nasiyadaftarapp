import axios from "axios";

function getDetailMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const detail = (payload as Record<string, unknown>).detail;
  if (typeof detail !== "string") return undefined;

  const message = detail.trim();
  return message.length > 0 ? message : undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!axios.isAxiosError(error)) return fallbackMessage;

  return getDetailMessage(error.response?.data) ?? fallbackMessage;
}

export function getApiErrorStatus(error: unknown): number | undefined {
  if (!axios.isAxiosError(error)) return undefined;

  if (typeof error.response?.status === "number") {
    return error.response.status;
  }

  const payload = error.response?.data;
  if (!payload || typeof payload !== "object") return undefined;

  const status = (payload as Record<string, unknown>).status;
  return typeof status === "number" ? status : undefined;
}
