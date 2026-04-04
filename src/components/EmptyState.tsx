import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography } from '../theme';

interface Props {
  iconName:    keyof typeof Ionicons.glyphMap;
  title:       string;
  description?: string;
  action?:     React.ReactNode;
}

export function EmptyState({ iconName, title, description, action }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
        <Ionicons name={iconName} size={40} color={theme.primary} />
      </View>
      <Text style={[typography.headingMedium, styles.title, { color: theme.text }]}>
        {title}
      </Text>
      {description ? (
        <Text style={[typography.bodyMedium, styles.desc, { color: theme.textSecondary }]}>
          {description}
        </Text>
      ) : null}
      {action ? <View style={styles.actionWrap}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconWrap: {
    width:         80,
    height:        80,
    borderRadius:  40,
    alignItems:    'center',
    justifyContent:'center',
    marginBottom:  spacing.lg,
  },
  title: {
    textAlign:    'center',
    marginBottom: spacing.sm,
  },
  desc: {
    textAlign:   'center',
    lineHeight:  22,
  },
  actionWrap: {
    marginTop: spacing.lg,
    width: '100%',
  },
});