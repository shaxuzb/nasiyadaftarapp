import axios from "axios";

/**
 * Reads the part of an error body that was written for a person.
 *
 * ProblemDetails puts that in `detail` ("SMS allaqachon yuborildi..."), while
 * `title` only names the status ("Bad request"). `title` is deliberately not
 * consulted here, because this value is shown in a toast; getDetailMessage
 * below still falls back to it for the cases that just need any description.
 */
function readProblemDetail(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;

  const candidate = payload as Record<string, unknown>;
  const detail = candidate.detail;
  const message = candidate.message;

  for (const value of [detail, message]) {
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

/** The human-readable reason from an error body, excluding the status name. */
export function getApiErrorDetail(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  return readProblemDetail(error.response?.data);
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
