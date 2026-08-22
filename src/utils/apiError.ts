import axios from "axios";

function getDetailMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const candidate = payload as Record<string, unknown>;
  const detail = candidate.detail;
  const message = candidate.message;
  const title = candidate.title;

  for (const value of [detail, message, title]) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text.length > 0) return text;
  }

  if (Array.isArray(detail)) {
    const messages = detail.filter(
      (item): item is string => typeof item === "string",
    );
    if (messages.length > 0) return messages.join("\n");
  }

  if (candidate.errors && typeof candidate.errors === "object") {
    const messages = Object.values(candidate.errors as Record<string, unknown>)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    if (messages.length > 0) return messages.join("\n");
  }

  return undefined;
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
