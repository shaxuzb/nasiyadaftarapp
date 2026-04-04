import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';

interface Props {
  label: string;
  value: string;
  accent?: string;
  small?: boolean;
}

export function StatCard({ label, value, accent, small }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          shadowColor:     theme.cardShadow,
        },
      ]}
    >
      {accent && <View style={[styles.accent, { backgroundColor: accent }]} />}
      <Text
        style={[
          small ? typography.headingMedium : typography.headingLarge,
          { color: accent ?? theme.text },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[typography.bodySmall, { color: theme.textSecondary, marginTop: 2 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex:          1,
    padding:       spacing.md,
    borderRadius:  radius.lg,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  6,
    elevation:     3,
  },
  accent: {
    width:        3,
    height:       24,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
});