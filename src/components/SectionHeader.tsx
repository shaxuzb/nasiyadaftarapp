import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';

interface Props {
  title:  string;
  action?: ReactNode;
}

export function SectionHeader({ title, action }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.accent, { backgroundColor: theme.primary }]} />
      <Text style={[typography.headingSmall, { color: theme.text, flex: 1 }]}>
        {title}
      </Text>
      {action ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    marginBottom:   spacing.md,
    marginTop:      spacing.sm,
  },
  accent: {
    width:        3,
    height:       18,
    borderRadius: 2,
    marginRight:  spacing.sm,
  },
});