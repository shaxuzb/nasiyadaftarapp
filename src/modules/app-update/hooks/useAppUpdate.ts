import Constants from "expo-constants";
import * as Application from "expo-application";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking } from "react-native";

import { useToast } from "../../../context/ToastContext";
import { useTranslation } from "../../../i18n";
import { APP_UPDATE_CHECK_INTERVAL_MS } from "../constants/appUpdate.constants";
import {
  fetchAppVersionCheck,
  getAppUpdatePlatform,
} from "../services/appUpdateService";
import {
  getDismissedUpdateVersion,
  setDismissedUpdateVersion,
} from "../services/appUpdateStorage";
import {
  AppUpdateController,
  AvailableAppUpdate,
} from "../types/appUpdate.types";
import { getAppUpdateDecision } from "../utils/appUpdateDecision";
import { isValidSemanticVersion } from "../utils/compareVersions";

function logDevelopmentError(message: string, error: unknown) {
  if (__DEV__) {
    console.warn(`[AppUpdate] ${message}`, error);
  }
}

function getCurrentVersion(): string | null {
  const version =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version;
  return isValidSemanticVersion(version) ? version.trim() : null;
}

export function useAppUpdate(): AppUpdateController {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [availableUpdate, setAvailableUpdate] =
    useState<AvailableAppUpdate | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isOpeningStore, setIsOpeningStore] = useState(false);

  const mountedRef = useRef(true);
  const lastCheckAtRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const openingStoreRef = useRef(false);
  const dismissedVersionRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const checkForUpdate = useCallback(
    async (ignoreThrottle = false): Promise<void> => {
      if (inFlightRef.current) return inFlightRef.current;

      const now = Date.now();
      if (
        !ignoreThrottle &&
        now - lastCheckAtRef.current < APP_UPDATE_CHECK_INTERVAL_MS
      ) {
        return;
      }

      lastCheckAtRef.current = now;
      const request = (async () => {
        if (mountedRef.current) setIsChecking(true);

        try {
          const platform = getAppUpdatePlatform();
          const currentVersion = getCurrentVersion();
          if (!platform || !currentVersion) return;

          const response = await fetchAppVersionCheck(platform, currentVersion);
          if (!response) return;

          const dismissedVersion =
            dismissedVersionRef.current ?? (await getDismissedUpdateVersion());
          dismissedVersionRef.current = dismissedVersion;

          const decision = getAppUpdateDecision(response, dismissedVersion);
          if (!decision.shouldShow) {
            if (mountedRef.current) setAvailableUpdate(null);
            return;
          }

          const config = {
            latestVersion: response.latestVersion,
            minimumVersion: response.minimumVersion,
            forceUpdate: response.forceUpdate,
            title: response.title,
            message: response.message,
            storeUrl: response.storeUrl,
          };

          if (mountedRef.current) {
            setAvailableUpdate({
              platform,
              currentVersion,
              config,
              isForced: decision.isForced,
            });
          }
        } catch (error) {
          logDevelopmentError("Update tekshiruvi bajarilmadi", error);
        } finally {
          if (mountedRef.current) setIsChecking(false);
        }
      })();

      inFlightRef.current = request;
      try {
        await request;
      } finally {
        if (inFlightRef.current === request) inFlightRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    void checkForUpdate(true);

    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (
        nextState === "active" &&
        (previousState === "background" || previousState === "inactive")
      ) {
        void checkForUpdate();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, [checkForUpdate]);

  const dismissUpdate = useCallback(() => {
    if (!availableUpdate || availableUpdate.isForced) return;

    const version = availableUpdate.config.latestVersion;
    dismissedVersionRef.current = version;
    setAvailableUpdate(null);
    void setDismissedUpdateVersion(version).catch((error) => {
      logDevelopmentError("Dismiss holatini saqlab bo‘lmadi", error);
    });
  }, [availableUpdate]);

  const openStore = useCallback(async () => {
    if (!availableUpdate || openingStoreRef.current) return;

    openingStoreRef.current = true;
    setIsOpeningStore(true);
    try {
      if (availableUpdate.platform === "android") {
        const applicationId = Application.applicationId;
        if (applicationId) {
          try {
            await Linking.openURL(`market://details?id=${applicationId}`);
            return;
          } catch (error) {
            logDevelopmentError(
              "Native Play Market ochilmadi, HTTPS fallback ishlatiladi",
              error,
            );
          }
        }
      }

      await Linking.openURL(availableUpdate.config.storeUrl);
    } catch (error) {
      logDevelopmentError("Store URL ochilmadi", error);
      showToast(t("common.update.storeOpenError"), "error");
    } finally {
      openingStoreRef.current = false;
      if (mountedRef.current) setIsOpeningStore(false);
    }
  }, [availableUpdate, showToast, t]);

  return {
    availableUpdate,
    isChecking,
    isOpeningStore,
    dismissUpdate,
    openStore,
    checkForUpdate,
  };
}
