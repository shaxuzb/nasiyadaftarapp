import { AppTheme } from '../types';
import { palette } from './colors';

export const darkTheme: AppTheme = {
  background:      palette.slate900,
  surface:         palette.dark800,
  surfaceElevated: palette.dark750,
  primary:         palette.teal500,
  primaryLight:    'rgba(20,184,166,0.15)',
  secondary:       palette.teal400,
  text:            '#e8f0f8',
  textSecondary:   palette.slate400,
  textMuted:       palette.slate600,
  border:          palette.dark600,
  inputBackground: palette.dark700,
  debtColor:       palette.red400,
  debtBg:          'rgba(248,113,113,0.12)',
  paymentColor:    palette.green400,
  paymentBg:       'rgba(74,222,128,0.12)',
  dangerColor:     palette.red400,
  warningColor:    palette.amber400,
  successColor:    palette.green400,
  cardShadow:      'rgba(0,0,0,0.35)',
  tabBar:          palette.dark800,
  tabBarBorder:    palette.dark600,
};