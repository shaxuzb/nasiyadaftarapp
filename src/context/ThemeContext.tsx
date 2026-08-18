import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ColorSchemeName, useColorScheme } from "react-native";

import { darkTheme, lightTheme } from "../theme";
import { AppTheme } from "../types";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeContextValue {
  theme: AppTheme;
  mode: ThemeMode;
  resolvedScheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const THEME_MODE_KEY = "theme_mode_v1";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveScheme(
  mode: ThemeMode,
  systemScheme: ColorSchemeName,
): "light" | "dark" {
  if (mode !== "system") return mode;
  return systemScheme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setStoredMode] = useState<ThemeMode>("system");

  useEffect(() => {
    let active = true;

    void AsyncStorage.getItem(THEME_MODE_KEY)
      .then((storedMode) => {
        if (!active) return;
        if (
          storedMode === "system" ||
          storedMode === "light" ||
          storedMode === "dark"
        ) {
          setStoredMode(storedMode);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setStoredMode(nextMode);
    void AsyncStorage.setItem(THEME_MODE_KEY, nextMode).catch(() => undefined);
  }, []);

  const resolvedScheme = resolveScheme(mode, systemScheme);
  const theme = resolvedScheme === "dark" ? darkTheme : lightTheme;
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedScheme, setMode }),
    [mode, resolvedScheme, setMode, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used inside ThemeProvider");
  }
  return context;
}
