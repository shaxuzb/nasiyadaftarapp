import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme';

interface Props extends ScrollViewProps {
  children: ReactNode;
  scrollable?: boolean;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  scrollable = true,
  padded = true,
  style,
  ...rest
}: Props) {
  const theme = useTheme();

  const inner = (
    <View style={[padded && styles.inner, style]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={['left', 'right']}
    >
      {scrollable ? (
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bottomOffset={24}
          extraKeyboardSpace={16}
          {...rest}
        >
          {inner}
        </KeyboardAwareScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },
  inner: {
    padding: spacing.md,
  },
});
