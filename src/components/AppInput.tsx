import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius, typography } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export function AppInput({ label, error, iconName, style, ...rest }: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.dangerColor
    : focused
    ? theme.primary
    : theme.border;

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[typography.label, styles.label, { color: theme.textSecondary }]}>
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.inputBackground,
            borderColor,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={18}
            color={focused ? theme.primary : theme.textMuted}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          style={[
            typography.bodyMedium,
            styles.input,
            { color: theme.text },
            style,
          ]}
          placeholderTextColor={theme.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>

      {error ? (
        <Text style={[typography.caption, styles.error, { color: theme.dangerColor }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   radius.md,
    paddingHorizontal: spacing.md,
    minHeight:      50,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: 2,
  },
});