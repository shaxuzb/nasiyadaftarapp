import React, { type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type AppTheme } from "../types";
import { radius, spacing, typography } from "../theme";
import { useTranslation } from "../i18n";

interface Props {
  children: ReactNode;
  theme: AppTheme;
}

interface State {
  hasError: boolean;
}

interface LocalizedCopy {
  title: string;
  description: string;
  retryLabel: string;
}

interface BoundaryProps extends Props {
  copy: LocalizedCopy;
}

export function AppErrorBoundary(props: Props) {
  const { t } = useTranslation();
  return (
    <AppErrorBoundaryView
      {...props}
      copy={{
        title: t("common.unexpectedError"),
        description: t("common.retryDescription"),
        retryLabel: t("common.retry"),
      }}
    />
  );
}

class AppErrorBoundaryView extends React.Component<BoundaryProps, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error("Unhandled application error", error, info.componentStack);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { theme, copy } = this.props;

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text
          style={[typography.headingMedium, { color: theme.text }]}
        >
          {copy.title}
        </Text>
        <Text
          style={[
            typography.bodyMedium,
            styles.description,
            { color: theme.textSecondary },
          ]}
        >
          {copy.description}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.retryLabel}
          onPress={this.handleRetry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>{copy.retryLabel}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  description: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
  button: {
    minHeight: 48,
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
