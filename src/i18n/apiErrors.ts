import axios from "axios";

import type { Translate, TranslateKey } from "./translate";
import { getApiErrorMessage, getApiErrorStatus } from "../utils/apiError";

const ERROR_CODE_KEYS: Record<string, TranslateKey> = {
  UNAUTHORIZED: "errors.unauthorized",
  AUTHENTICATION_REQUIRED: "errors.unauthorized",
  FORBIDDEN: "errors.forbidden",
  PERMISSION_DENIED: "errors.forbidden",
  VALIDATION_ERROR: "errors.validation",
  INVALID_REQUEST: "errors.validation",
  NOT_FOUND: "errors.notFound",
  NETWORK_ERROR: "errors.network",
};

const ERROR_STATUS_KEYS: Partial<Record<number, TranslateKey>> = {
  401: "errors.unauthorized",
  403: "errors.forbidden",
  404: "errors.notFound",
  422: "errors.validation",
};

function getResponseCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined;
  const payload = error.response?.data;

  if (!payload || typeof payload !== "object") return undefined;

  const body = payload as Record<string, unknown>;
  for (const value of [body.detail, body.errorCode, body.type]) {
    if (typeof value !== "string") continue;
    const normalized = value.trim().toUpperCase();
    if (normalized) return normalized;
  }
  return undefined;
}

export function getLocalizedApiErrorMessage(
  error: unknown,
  fallbackKey: TranslateKey,
  t: Translate,
): string {
  const status = getApiErrorStatus(error);
  const detail = getApiErrorMessage(error, "").trim();

  // The login endpoint uses 401 for invalid credentials and returns the
  // actionable message in ProblemDetails.detail. A generic 401 fallback is
  // still appropriate everywhere else because it usually means an expired
  // session, not a failed login attempt.
  if (status === 401 && fallbackKey === "auth.login.error" && detail) {
    return detail;
  }

  const codeKey = getResponseCode(error);
  const mappedKey = codeKey ? ERROR_CODE_KEYS[codeKey] : undefined;
  if (status === 409) {
    return detail || t("errors.conflict");
  }

  return t(mappedKey ?? ERROR_STATUS_KEYS[status ?? -1] ?? fallbackKey);
}
