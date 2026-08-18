import { AppTheme } from "../types";
import { useThemeContext } from "../context/ThemeContext";

export function useTheme(): AppTheme {
  return useThemeContext().theme;
}
