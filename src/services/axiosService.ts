import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "../config/env";
import {
  assertOnlineForMutation,
  isServerMutationMethod,
} from "../core/network/networkState";
import { AuthRefreshResponse } from "../modules/auth/types";
import { isPublicAccountRoute } from "./accountRoute";
import {
  clearAuthSession,
  getAuthSessionSync,
  hydrateAuthSession,
  setAuthSession,
} from "./authStorage";

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<string | null> | null = null;
let unauthorizedHandler: (() => void) | undefined;

// The stored session is only invalid when the refresh endpoint explicitly
// rejects it. Network failures, timeouts and 5xx responses are transient, so
// clearing the session there would sign the user out on a brief connectivity
// drop instead of letting the next request recover.
const SESSION_REJECTED_STATUSES = new Set([400, 401, 403]);

function isSessionRejected(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  return typeof status === "number" && SESSION_REJECTED_STATUSES.has(status);
}

export function setUnauthorizedHandler(handler?: () => void) {
  unauthorizedHandler = handler;
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const session = getAuthSessionSync() ?? (await hydrateAuthSession());
    if (!session) {
      return null;
    }

    const response = await axios.post<AuthRefreshResponse>(
      `${API_BASE_URL}/account/refresh`,
      {
        refreshToken: session.refreshToken,
        uniqueId: session.uniqueId,
      },
      {
        timeout: 50000,
        headers: { "Content-Type": "application/json" },
      },
    );

    const newAccessToken = (
      response.data.accessToken ?? response.data.token
    )?.trim();
    if (!newAccessToken) {
      throw new Error("Refresh response did not include an access token");
    }

    const newRefreshToken = response.data.refreshToken?.trim();
    const refreshedSession = {
      ...session,
      token: newAccessToken,
      refreshToken: newRefreshToken || session.refreshToken,
    };

    await setAuthSession(refreshedSession);
    return newAccessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (isServerMutationMethod(config.method)) {
    assertOnlineForMutation();
  }

  const session = getAuthSessionSync();
  if (session?.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      !originalRequest ||
      status !== 401 ||
      originalRequest._retry ||
      isPublicAccountRoute(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();
      if (!newToken) {
        throw error;
      }

      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      if (isSessionRejected(refreshError)) {
        await clearAuthSession();
        unauthorizedHandler?.();
      }
      return Promise.reject(refreshError);
    }
  },
);
