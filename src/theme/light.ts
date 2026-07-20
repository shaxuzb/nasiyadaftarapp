import { AppTheme } from '../types';
import { palette } from './colors';

export const lightTheme: AppTheme = {
  // Backgrounds — very slight blue tint, not harsh pure-white
  background:      '#F4F7FB',
  surface:         palette.white,
  surfaceElevated: palette.white,

  // Primary — navy matching logo background
  primary:         palette.navy700,   // #163470 — rich navy
  primaryLight:    palette.navy50,    // #EBF2FD — whisper-light navy tint

  // Secondary accent (logo gradient cyan)
  secondary:       palette.cyan500,

  // Text — navy-tinted for harmony (not pure black/gray)
  text:            '#0D1F3C',         // deep navy-black
  textSecondary:   '#3A5580',         // medium navy-gray
  textMuted:       '#5070A0',         // muted blue-gray (WCAG AA ≥4.5)

  // Borders & inputs
  border:          '#D8E4F2',
  inputBackground: '#F0F4FA',

  // Semantic colors (slightly richer than default)
  debtColor:       palette.red600,    // #DC2626
  debtBg:          '#FEE2E2',         // red-100 — ko'rinadigan, lekin o'tkir emas
  paymentColor:    palette.green600,  // #16A34A
  paymentBg:       '#DCFCE7',         // green-100 — ko'rinadigan, lekin o'tkir emas
  dangerColor:     palette.red600,
  warningColor:    palette.amber500,
  successColor:    palette.green600,

  // Card shadows — navy-tinted (feels premium, not generic gray)
  cardShadow:      'rgba(22, 52, 112, 0.08)',

  // Tab bar
  tabBar:          palette.white,
  tabBarBorder:    '#D8E4F2',
};
