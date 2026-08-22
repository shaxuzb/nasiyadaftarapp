import { AppTheme } from "../types";
import { palette } from "./colors";

export const darkTheme: AppTheme = {
  // Backgrounds — deep navy matching the logo itself
  background: "#07111F",
  surface: "#0D1B2E",
  surfaceElevated: "#13243A",

  // Primary — lighter navy for dark-mode readability
  primary: "#4A73C2",
  primaryLight: "#152F52",

  // Secondary
  secondary: "#4F8FEF",

  // Text
  text: "#F2F6FC",
  textSecondary: "#B7C5D9",
  textMuted: "#8393AA",

  // Borders & inputs
  border: "#223650",
  inputBackground: "#14263C",

  // Semantic
  debtColor: "#FF8A65",
  debtBg: "#3A211E",
  paymentColor: "#5ED58A",
  paymentBg: "#153324",
  dangerColor: palette.red400,
  warningColor: palette.amber400,
  successColor: palette.green400,

  // Card shadows
  cardShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",

  // Tab bar
  tabBar: palette.dark850,
  tabBarBorder: palette.dark700,
};
