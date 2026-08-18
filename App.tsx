import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppProvider } from "./src/context/AppContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ConfirmDialogProvider } from "./src/context/ConfirmDialogContext";
import { ToastProvider } from "./src/context/ToastContext";
import { AppNavigator } from "./src/navigation";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { useTheme } from "./src/hooks/useTheme";
import { ThemeProvider, useThemeContext } from "./src/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/core/query/queryClient";
import { BottomSheetProvider } from "./src/bottom-sheet";
import { AppUpdateGate } from "./src/modules/app-update";

const ONBOARDING_DONE_KEY = "onboarding_done_v1";

export default function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function ThemedApp() {
  const theme = useTheme();
  const { resolvedScheme } = useThemeContext();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      setShowOnboarding(done !== "1");
      setLoading(false);
    })();
  }, []);

  async function handleFinishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, "1");
    setShowOnboarding(false);
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <ToastProvider>
            <KeyboardProvider>
              <BottomSheetModalProvider>
                <AuthProvider>
                  <AppProvider>
                    <BottomSheetProvider>
                      <ConfirmDialogProvider>
                        <AppUpdateGate>
                          <StatusBar
                            style={resolvedScheme === "dark" ? "light" : "dark"}
                            backgroundColor={theme.background}
                          />
                          {showOnboarding ? (
                            <OnboardingScreen
                              onFinish={handleFinishOnboarding}
                            />
                          ) : (
                            <AppNavigator />
                          )}
                        </AppUpdateGate>
                      </ConfirmDialogProvider>
                    </BottomSheetProvider>
                  </AppProvider>
                </AuthProvider>
              </BottomSheetModalProvider>
            </KeyboardProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
