import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  INITIAL_APP_SETUP,
  parseAppSetup,
  type AppSetup,
  type CurrencyCode,
} from "../data/setupOptions";

const STORAGE_KEY = "app_setup_v1";

interface AppSetupContextValue extends AppSetup {
  /** The stored setup has been read; until then nothing is decided. */
  ready: boolean;
  /** Ends first launch with the currency chosen. */
  completeSetup: (currency: CurrencyCode) => Promise<void>;
  /** Ends it without asking, for someone already signed in from before. */
  markCompleted: () => Promise<void>;
}

const AppSetupContext = createContext<AppSetupContextValue | undefined>(undefined);

async function save(setup: AppSetup) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(setup));
  } catch (error) {
    // Losing it only means the choice is offered again next launch.
    if (__DEV__) console.warn("App setup could not be saved", error);
  }
}

/** First launch: whether it is done, and the currency it chose. */
export function AppSetupProvider({ children }: { children: ReactNode }) {
  const [setup, setSetup] = useState<AppSetup>(INITIAL_APP_SETUP);
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .catch(() => null)
      .then((raw) => {
        if (!active) return;
        setSetup(parseAppSetup(raw));
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const completeSetup = useCallback(async (currency: CurrencyCode) => {
    const next: AppSetup = { completed: true, currency };
    setSetup(next);
    await save(next);
  }, []);

  const markCompleted = useCallback(async () => {
    if (setupRef.current.completed) return;
    const next: AppSetup = { ...setupRef.current, completed: true };
    setSetup(next);
    await save(next);
  }, []);

  const value = useMemo<AppSetupContextValue>(
    () => ({ ...setup, ready, completeSetup, markCompleted }),
    [completeSetup, markCompleted, ready, setup],
  );

  return <AppSetupContext.Provider value={value}>{children}</AppSetupContext.Provider>;
}

export function useAppSetup(): AppSetupContextValue {
  const context = useContext(AppSetupContext);
  if (!context) throw new Error("useAppSetup must be used inside AppSetupProvider");
  return context;
}
