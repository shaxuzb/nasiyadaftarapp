import React, { type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { type AppTheme } from "../types";
import { radius, spacing, typography } from "../theme";

interface Props {
  children: ReactNode;
  theme: AppTheme;
}

interface State {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<Props, State> {
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

    const { theme } = this.props;

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text
          style={[typography.headingMedium, { color: theme.text }]}
        >
          Kutilmagan xatolik yuz berdi
        </Text>
        <Text
          style={[
            typography.bodyMedium,
            styles.description,
            { color: theme.textSecondary },
          ]}
        >
          Ilovani qayta urinib ko'ring. Muammo takrorlansa, qo'llab-quvvatlash xizmatiga murojaat qiling.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Qayta urinish"
          onPress={this.handleRetry}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.primary, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={styles.buttonText}>Qayta urinish</Text>
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
