import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../hooks/useTheme";
import {
  DEFAULT_LOCALE,
  Locale,
  TranslateParams,
} from "./types";
import { createTranslator, Translate, TranslateKey } from "./translate";
import { readStoredLocale, writeStoredLocale } from "./i18nStorage";
import { getCurrentLocale, setCurrentLocale } from "./currentLocale";
import { queryClient } from "../core/query/queryClient";

interface LanguageContextValue {
  locale: Locale;
  isHydrated: boolean;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    void readStoredLocale().then((storedLocale) => {
      if (!active) return;
      setCurrentLocale(storedLocale);
      setLocaleState(storedLocale);
      setIsHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    const changed = getCurrentLocale() !== nextLocale;
    // Before the state, so requests made by the re-render already ask the
    // server for the new language.
    setCurrentLocale(nextLocale);
    setLocaleState(nextLocale);
    void writeStoredLocale(nextLocale);
    // What the server wrote (plan names, lesson titles, notifications, SMS
    // text) was cached in the old language: fetched again in the new one.
    if (changed) void queryClient.invalidateQueries();
  }, []);

  const t = useMemo(() => createTranslator(locale), [locale]);
  const value = useMemo<LanguageContextValue>(
    () => ({ locale, isHydrated, setLocale, t }),
    [isHydrated, locale, setLocale, t],
  );

  if (!isHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used inside LanguageProvider");
  }
  return context;
}

export type { Locale, Translate, TranslateKey, TranslateParams };
