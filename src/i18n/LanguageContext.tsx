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
      setLocaleState(storedLocale);
      setIsHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
    void writeStoredLocale(nextLocale);
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
