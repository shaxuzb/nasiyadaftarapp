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
  for (const value of [body.code, body.errorCode, body.type]) {
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
  const codeKey = getResponseCode(error);
  const mappedKey = codeKey ? ERROR_CODE_KEYS[codeKey] : undefined;
  const statusKey = getApiErrorStatus(error);

  if (statusKey === 409) {
    const detail = getApiErrorMessage(error, "").trim();
    return detail || t("errors.conflict");
  }

  return t(mappedKey ?? ERROR_STATUS_KEYS[statusKey ?? -1] ?? fallbackKey);
}
