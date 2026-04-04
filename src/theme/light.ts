import { AppTheme } from '../types';
import { palette } from './colors';

export const lightTheme: AppTheme = {
  background:      palette.slate100,
  surface:         palette.white,
  surfaceElevated: palette.white,
  primary:         palette.teal600,
  primaryLight:    palette.teal50,
  secondary:       palette.teal400,
  text:            palette.slate800,
  textSecondary:   palette.slate600,
  textMuted:       palette.slate400,
  border:          palette.slate200,
  inputBackground: palette.slate50,
  debtColor:       palette.red500,
  debtBg:          palette.red50,
  paymentColor:    palette.green500,
  paymentBg:       palette.green50,
  dangerColor:     palette.red500,
  warningColor:    palette.amber500,
  successColor:    palette.green500,
  cardShadow:      'rgba(15, 23, 42, 0.08)',
  tabBar:          palette.white,
  tabBarBorder:    palette.slate200,
};