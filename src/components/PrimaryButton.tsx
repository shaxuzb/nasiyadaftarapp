import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle;
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bgColor =
    variant === 'primary' ? theme.primary :
    variant === 'danger'  ? theme.dangerColor :
    'transparent';

  const textColor =
    variant === 'outline' ? theme.primary : '#fff';

  const borderColor =
    variant === 'outline' ? theme.primary : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        { backgroundColor: bgColor, borderColor, opacity: isDisabled ? 0.6 : 1 },
        variant === 'outline' && styles.outline,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[typography.headingSmall, styles.label, { color: textColor }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height:         52,
    borderRadius:   radius.md,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  outline: {
    borderWidth: 1.5,
  },
  label: {
    letterSpacing: 0.3,
  },
});