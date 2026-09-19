import React, {
  createContext,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  type RemoteMessage,
} from "@react-native-firebase/messaging";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  clearPushRegistrationCache,
  getPushNotificationsEnabled,
  getNotificationPermissionState,
  openPushSystemSettings,
  registerCurrentPushDevice,
  registerPushToken,
  setPushNotificationsEnabled,
  unregisterCurrentPushDevice,
  type PushPermissionState,
} from "../services/pushRegistration";
import { getNotificationIdFromData } from "../utils/notificationPayload";

export interface PushForegroundMessage {
  title: string;
  body: string;
  notificationId: number | null;
}

export interface PushNotificationContextValue {
  permission: PushPermissionState;
  isEnabled: boolean;
  isRegistering: boolean;
  lastError: string | null;
  foregroundMessage: PushForegroundMessage | null;
  pendingNotificationId: number | null;
  hasPendingNotification: boolean;
  requestPermissionAndRegister: () => Promise<boolean>;
  retryRegistration: () => Promise<boolean>;
  setNotificationsEnabled: (enabled: boolean) => Promise<boolean>;
  refreshPermission: () => Promise<PushPermissionState | null>;
  openSystemSettings: () => Promise<void>;
  dismissForegroundMessage: () => void;
  clearPendingNotification: () => void;
}

export const PushNotificationContext =
  createContext<PushNotificationContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Push registration failed";
}

function messagePresentation(message: RemoteMessage): PushForegroundMessage {
  const data = message.data ?? {};
  const title = typeof data.title === "string" ? data.title : "";
  const body = typeof data.body === "string" ? data.body : "";
  return {
    title: message.notification?.title ?? title,
    body: message.notification?.body ?? body,
    notificationId: getNotificationIdFromData(message.data),
  };
}

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<PushPermissionState>(
    "undetermined",
  );
  const [isEnabled, setIsEnabled] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [foregroundMessage, setForegroundMessage] =
    useState<PushForegroundMessage | null>(null);
  const [pendingNotificationId, setPendingNotificationId] = useState<
    number | null
  >(null);
  const [hasPendingNotification, setHasPendingNotification] = useState(false);
  const activeRef = useRef(true);

  const invalidatePushQueries = useCallback(() => {
    if (!userId) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.pushNotifications(userId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.pushUnreadCount(userId),
    });
  }, [queryClient, userId]);

  const requestPermissionAndRegister = useCallback(async () => {
    if (!userId) return false;
    setIsRegistering(true);
    setLastError(null);
    try {
      const result = await registerCurrentPushDevice();
      if (activeRef.current) {
        setPermission(result.permission);
        if (!result.payload && result.permission === "denied") {
          setIsEnabled(false);
        }
      }
      return Boolean(result.payload);
    } catch (error) {
      if (activeRef.current) setLastError(errorMessage(error));
      return false;
    } finally {
      if (activeRef.current) setIsRegistering(false);
    }
  }, [userId]);

  const setNotificationsEnabled = useCallback(
    async (enabled: boolean) => {
      if (!userId) return false;
      setIsRegistering(true);
      setLastError(null);
      try {
        if (!enabled) {
          await unregisterCurrentPushDevice();
          await setPushNotificationsEnabled(userId, false);
          if (activeRef.current) setIsEnabled(false);
          return true;
        }

        const result = await registerCurrentPushDevice();
        if (activeRef.current) setPermission(result.permission);
        if (!result.payload) {
          if (activeRef.current && result.permission === "denied") {
            setIsEnabled(false);
          }
          return false;
        }

        await setPushNotificationsEnabled(userId, true);
        if (activeRef.current) setIsEnabled(true);
        return true;
      } catch (error) {
        if (activeRef.current) setLastError(errorMessage(error));
        return false;
      } finally {
        if (activeRef.current) setIsRegistering(false);
      }
    },
    [userId],
  );

  const refreshPermission = useCallback(async () => {
    if (!userId) return null;
    try {
      const nextPermission = await getNotificationPermissionState();
      if (activeRef.current) {
        setPermission(nextPermission);
        if (nextPermission === "denied") setIsEnabled(false);
      }
      return nextPermission;
    } catch (error) {
      if (activeRef.current) setLastError(errorMessage(error));
      return null;
    }
  }, [userId]);

  const clearPendingNotification = useCallback(() => {
    setPendingNotificationId(null);
    setHasPendingNotification(false);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    if (!userId) {
      clearPushRegistrationCache();
      setPermission("undetermined");
      setIsEnabled(true);
      setIsRegistering(false);
      setLastError(null);
      setPendingNotificationId(null);
      setHasPendingNotification(false);
      setForegroundMessage(null);
      return () => {
        activeRef.current = false;
      };
    }

    let disposed = false;
    const instance = getMessaging();
    const handleForegroundMessage = (message: RemoteMessage) => {
      if (disposed) return;
      invalidatePushQueries();
      const presentation = messagePresentation(message);
      if (presentation.title || presentation.body) {
        setForegroundMessage(presentation);
      }
    };
    const handleOpenedMessage = (message: RemoteMessage) => {
      if (disposed) return;
      invalidatePushQueries();
      setHasPendingNotification(true);
      setPendingNotificationId(getNotificationIdFromData(message.data));
    };

    const unsubscribeMessage = onMessage(instance, handleForegroundMessage);
    const unsubscribeOpened = onNotificationOpenedApp(
      instance,
      handleOpenedMessage,
    );
    const unsubscribeTokenRefresh = onTokenRefresh(instance, (token: string) => {
      void getPushNotificationsEnabled(userId).then((enabled) => {
        if (!enabled || disposed) return;
        return registerPushToken(token).catch((error) => {
          if (!disposed) setLastError(errorMessage(error));
        });
      });
    });

    void (async () => {
      try {
        const notificationsEnabled = await getPushNotificationsEnabled(userId);
        const existingPermission = await getNotificationPermissionState();
        if (!disposed) {
          setPermission(existingPermission);
          setIsEnabled(notificationsEnabled && existingPermission !== "denied");
        }

        const initialMessage = await getInitialNotification(instance);
        if (!disposed && initialMessage) {
          invalidatePushQueries();
          setHasPendingNotification(true);
          setPendingNotificationId(
            getNotificationIdFromData(initialMessage.data),
          );
        }

        if (
          !disposed &&
          notificationsEnabled &&
          existingPermission !== "denied"
        ) {
          await requestPermissionAndRegister();
        }
      } catch (error) {
        if (!disposed) setLastError(errorMessage(error));
      }
    })();

    return () => {
      disposed = true;
      unsubscribeMessage();
      unsubscribeOpened();
      unsubscribeTokenRefresh();
      activeRef.current = false;
    };
  }, [invalidatePushQueries, requestPermissionAndRegister, userId]);

  useEffect(() => {
    if (!userId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refreshPermission();
    });
    return () => subscription.remove();
  }, [refreshPermission, userId]);

  const value = useMemo<PushNotificationContextValue>(
    () => ({
      permission,
      isEnabled,
      isRegistering,
      lastError,
      foregroundMessage,
      pendingNotificationId,
      hasPendingNotification,
      requestPermissionAndRegister,
      retryRegistration: requestPermissionAndRegister,
      setNotificationsEnabled,
      refreshPermission,
      openSystemSettings: openPushSystemSettings,
      dismissForegroundMessage: () => setForegroundMessage(null),
      clearPendingNotification,
    }),
    [
      clearPendingNotification,
      foregroundMessage,
      hasPendingNotification,
      isEnabled,
      isRegistering,
      lastError,
      pendingNotificationId,
      permission,
      requestPermissionAndRegister,
      refreshPermission,
      setNotificationsEnabled,
    ],
  );

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
}
