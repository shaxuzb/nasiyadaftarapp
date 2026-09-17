import { AppTheme } from "../types";
import { palette } from "./colors";

export const darkTheme: AppTheme = {
  // Backgrounds — neutral charcoal for a softer, low-glare dark mode
  background: "#111315",
  surface: "#191B1F",
  surfaceElevated: "#202329",

  // Primary — blue remains the action accent, not the surface color
  primary: "#5B8DEF",
  primaryLight: "#1D2A3D",

  // Secondary
  secondary: "#58B8C8",

  // Text
  text: "#F1F3F5",
  textSecondary: "#B7BDC6",
  textMuted: "#858C97",

  // Borders & inputs
  border: "#2D3239",
  inputBackground: "#22252A",

  // Semantic
  debtColor: "#FF8A65",
  debtBg: "#3A2522",
  paymentColor: "#5ED58A",
  paymentBg: "#183126",
  dangerColor: palette.red400,
  warningColor: palette.amber400,
  successColor: palette.green400,

  // Card shadows
  cardShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",

  // Tab bar
  tabBar: "#17191C",
  tabBarBorder: "#292D33",
};
