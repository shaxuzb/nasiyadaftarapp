import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  displayLarge: {
    fontSize:   32,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  displayMedium: {
    fontSize:   26,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  headingLarge: {
    fontSize:   22,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 30,
  },
  headingMedium: {
    fontSize:   18,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 26,
  },
  headingSmall: {
    fontSize:   15,
    fontWeight: '600',
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize:   16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize:   14,
    fontWeight: '400',
    lineHeight: 21,
  },
  bodySmall: {
    fontSize:   13,
    fontWeight: '400',
    lineHeight: 19,
  },
  caption: {
    fontSize:   12,
    fontWeight: '400',
    lineHeight: 17,
  },
  label: {
    fontSize:   13,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize:   11,
    fontWeight: '600',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  mono: {
    fontSize:   15,
    fontWeight: '600',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
};
