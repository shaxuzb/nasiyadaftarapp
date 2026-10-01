import axios from "axios";

import type { Translate, TranslateKey } from "./translate";
import { getApiErrorDetail, getApiErrorStatus } from "../utils/apiError";
import { OFFLINE_MUTATION_ERROR_CODE } from "../core/network/networkState";

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
  409: "errors.conflict",
  422: "errors.validation",
};

// A toast is one or two lines. Anything longer is a stack trace or a dump of
// every field error, which reads worse than the app's own sentence.
const MAX_DETAIL_LENGTH = 200;

function isPresentableDetail(detail: string | undefined): detail is string {
  return detail !== undefined && detail.length > 0 && detail.length <= MAX_DETAIL_LENGTH;
}

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
  // A request blocked while offline never reached the server, so the network
  // layer's own wording is the only thing worth saying. Without this the user
  // sees "could not save", which reads as a server problem.
  if (error instanceof Error && error.name === OFFLINE_MUTATION_ERROR_CODE) {
    return error.message;
  }

  const status = getApiErrorStatus(error);

  // A machine code names a condition the app already has a sentence for, so the
  // translation wins over echoing the code back at the user.
  const codeKey = getResponseCode(error);
  const mappedKey = codeKey ? ERROR_CODE_KEYS[codeKey] : undefined;
  if (mappedKey) return t(mappedKey);

  // Every 4xx comes back as ProblemDetails whose `detail` says what happened
  // and what to do about it — "SMS allaqachon yuborildi. Iltimos, biroz
  // kuting." No generic message the app could substitute is as useful, so the
  // server's sentence wins.
  //
  // 401 is the exception. It nearly always means the session expired, which
  // the user can neither understand nor act on, so the translated message
  // stays — except on the sign-in screen, where a 401 really does describe the
  // attempt that just failed.
  const detail = getApiErrorDetail(error);
  if (isPresentableDetail(detail) && status !== undefined) {
    if (status === 401) {
      if (fallbackKey === "auth.login.error") return detail;
    } else if (status >= 400 && status < 500) {
      return detail;
    }
  }

  return t(ERROR_STATUS_KEYS[status ?? -1] ?? fallbackKey);
}
