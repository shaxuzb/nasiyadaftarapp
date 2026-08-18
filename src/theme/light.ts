import { AppTheme } from "../types";
import { palette } from "./colors";

export const lightTheme: AppTheme = {
  // Backgrounds — very slight blue tint, not harsh pure-white
  background: "#F7F9FC",
  surface: palette.white,
  surfaceElevated: palette.white,

  // Primary — navy matching logo background
  primary: "#0B5DEB",
  primaryLight: "#E7F0FF",

  // Secondary accent (logo gradient cyan)
  secondary: palette.cyan500,

  // Text — navy-tinted for harmony (not pure black/gray)
  text: "#071426",
  textSecondary: "#536987",
  textMuted: "#71819A",

  // Borders & inputs
  border: "#E2E9F2",
  inputBackground: "#F1F4F8",

  // Semantic colors (slightly richer than default)
  debtColor: "#F4511E",
  debtBg: "#FFF0E8",
  paymentColor: "#159447",
  paymentBg: "#E7F8ED",
  dangerColor: palette.red600,
  warningColor: palette.amber500,
  successColor: palette.green600,

  // Card shadows — navy-tinted (feels premium, not generic gray)
  cardShadow: "0 6px 20px rgba(24, 48, 80, 0.08)",

  // Tab bar
  tabBar: palette.white,
  tabBarBorder: "#D8E4F2",
};
