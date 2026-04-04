import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { formatCurrency } from '../utils';
import { spacing, radius, typography } from '../theme';

interface Props {
  balance: number;
  large?: boolean;
}

export function BalanceBadge({ balance, large }: Props) {
  const theme   = useTheme();
  const settled = balance <= 0;

  const color  = settled ? theme.successColor : theme.debtColor;
  const bgColor = settled ? theme.paymentBg    : theme.debtBg;

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, large && styles.large]}>
      <Text
        style={[
          large ? typography.headingLarge : typography.label,
          { color },
        ]}
      >
        {settled ? "Hisob-kitob qilingan" : formatCurrency(balance)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius:      radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm,
    alignSelf:         'flex-start',
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingVertical:   spacing.md,
    borderRadius:      radius.lg,
    alignSelf:         'stretch',
    alignItems:        'center',
  },
});