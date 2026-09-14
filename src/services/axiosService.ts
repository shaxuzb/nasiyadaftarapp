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

    const refreshedSession = {
      ...session,
      token: response.data.token,
      refreshToken: response.data.refreshToken ?? session.refreshToken,
    };

    await setAuthSession(refreshedSession);
    return refreshedSession.token;
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
      await clearAuthSession();
      unauthorizedHandler?.();
      return Promise.reject(refreshError);
    }
  },
);
