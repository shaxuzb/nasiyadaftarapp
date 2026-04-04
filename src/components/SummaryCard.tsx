import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';

interface Props {
  label:    string;
  value:    string;
  iconName: keyof typeof Ionicons.glyphMap;
  color?:   string;
  bgColor?: string;
  flex?:    number;
}

export function SummaryCard({
  label,
  value,
  iconName,
  color,
  bgColor,
  flex,
}: Props) {
  const theme  = useTheme();
  const accent = color   ?? theme.primary;
  const bg     = bgColor ?? theme.primaryLight;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          shadowColor:     theme.cardShadow,
          flex,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: bg }]}>
        <Ionicons name={iconName} size={20} color={accent} />
      </View>
      <Text
        style={[typography.displayMedium, styles.value, { color: theme.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      <Text style={[typography.caption, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding:       spacing.md,
    borderRadius:  radius.lg,
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius:  8,
    elevation:     3,
    minWidth:      140,
  },
  iconWrap: {
    width:         38,
    height:        38,
    borderRadius:  radius.sm,
    alignItems:    'center',
    justifyContent:'center',
    marginBottom:  spacing.sm,
  },
  value: {
    marginBottom: 2,
  },
});