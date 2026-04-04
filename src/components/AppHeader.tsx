import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, typography, radius } from '../theme';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  right?: ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  showBack,
  onBack,
  right,
}: Props) {
  const theme = useTheme();

  return (
    <SafeAreaView
      style={[styles.safe, {
        backgroundColor:  theme.surface,
        borderBottomColor: theme.border,
      }]}
      edges={['top']}
    >
      <View style={styles.row}>
        {/* Left */}
        <View style={styles.left}>
          {showBack && (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.backBtn, { backgroundColor: theme.background }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center */}
        <View style={styles.center}>
          <Text
            style={[typography.headingSmall, { color: theme.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[typography.caption, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Right */}
        <View style={styles.right}>{right ?? null}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    borderBottomWidth: 1,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 2,
    minHeight: 56,
  },
  left: {
    width: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 40,
    alignItems: 'flex-end',
  },
  backBtn: {
    width:         34,
    height:        34,
    borderRadius:  radius.sm,
    alignItems:    'center',
    justifyContent:'center',
  },
});