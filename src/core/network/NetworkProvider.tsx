import NetInfo from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useTranslation } from "../../i18n";
import { getNetworkCopy } from "./networkCopy";
import {
  NetworkStatus,
  normalizeNetworkStatus,
  setCurrentNetworkStatus,
  setOfflineMutationMessage,
} from "./networkState";

type NetworkContextValue = {
  status: NetworkStatus;
  isOnline: boolean;
  isOffline: boolean;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { locale } = useTranslation();
  const [status, setStatus] = useState<NetworkStatus>("unknown");

  useEffect(() => {
    setOfflineMutationMessage(getNetworkCopy(locale).internetRequired);
  }, [locale]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextStatus = normalizeNetworkStatus(
        state.isConnected,
        state.isInternetReachable,
      );

      setCurrentNetworkStatus(nextStatus);
      setStatus(nextStatus);
      onlineManager.setOnline(nextStatus !== "offline");
    });

    return unsubscribe;
  }, []);

  const value = useMemo<NetworkContextValue>(
    () => ({
      status,
      isOnline: status === "online",
      isOffline: status === "offline",
    }),
    [status],
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkStatus(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetworkStatus must be used inside NetworkProvider");
  }
  return context;
}
