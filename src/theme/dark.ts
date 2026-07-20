import { AppTheme } from '../types';
import { palette } from './colors';

export const darkTheme: AppTheme = {
  // Backgrounds — deep navy matching the logo itself
  background:      palette.dark900,       // #091833 — logo navy
  surface:         palette.dark850,       // #0C1F3F — slightly lighter
  surfaceElevated: palette.dark800,       // #0F2549 — cards/modals

  // Primary — lighter navy for dark-mode readability
  primary:         palette.navy300,       // #6095E0 — clear blue
  primaryLight:    'rgba(96,149,224,0.15)',

  // Secondary
  secondary:       palette.navy400,       // #3B73D0

  // Text
  text:            '#E2ECFA',             // soft white-blue
  textSecondary:   '#8FB4E8',             // muted blue
  textMuted:       '#6B90C0',             // muted (WCAG AA ≥4.5 on surface)

  // Borders & inputs
  border:          palette.dark700,       // #183566
  inputBackground: palette.dark750,       // #132D57

  // Semantic
  debtColor:       palette.red400,        // #F87171
  debtBg:          'rgba(248,113,113,0.16)',
  paymentColor:    palette.green400,      // #4ADE80
  paymentBg:       'rgba(74,222,128,0.16)',
  dangerColor:     palette.red400,
  warningColor:    palette.amber400,
  successColor:    palette.green400,

  // Card shadows
  cardShadow:      'rgba(0,0,0,0.45)',

  // Tab bar
  tabBar:          palette.dark850,
  tabBarBorder:    palette.dark700,
};
