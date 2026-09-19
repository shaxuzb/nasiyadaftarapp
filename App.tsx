import "react-native-gesture-handler";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { AppProvider } from "./src/context/AppContext";
import { AuthProvider } from "./src/context/AuthContext";
import { ConfirmDialogProvider } from "./src/context/ConfirmDialogContext";
import { ToastProvider } from "./src/context/ToastContext";
import { AppNavigator } from "./src/navigation";
import { useTheme } from "./src/hooks/useTheme";
import { ThemeProvider, useThemeContext } from "./src/context/ThemeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./src/core/query/queryClient";
import { NetworkProvider } from "./src/core/network/NetworkProvider";
import { OfflineBanner } from "./src/core/network/OfflineBanner";
import { BottomSheetProvider } from "./src/bottom-sheet";
import { AppUpdateGate } from "./src/modules/app-update";
import { AppErrorBoundary } from "./src/components/AppErrorBoundary";
import { AccountSecurityProvider } from "./src/modules/account/context/AccountSecurityContext";
import { AppLockProvider } from "./src/modules/pin-auth/context/AppLockContext";
import { PaymentRecoveryGate } from "./src/modules/payments/components/PaymentRecoveryGate";
import { LanguageProvider } from "./src/i18n";
import { PushNotificationProvider } from "./src/modules/push/context/PushNotificationContext";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function ThemedApp() {
  const theme = useTheme();
  const { resolvedScheme } = useThemeContext();

  return (
    <AppErrorBoundary theme={theme}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <OfflineBanner />
              <ToastProvider>
                <KeyboardProvider>
                  <AuthProvider>
                    <PushNotificationProvider>
                      <AppLockProvider>
                        <AccountSecurityProvider>
                          <AppProvider>
                            <BottomSheetModalProvider>
                              <ConfirmDialogProvider>
                                <BottomSheetProvider>
                                  <AppUpdateGate>
                                    <PaymentRecoveryGate enabled={true} />
                                    <StatusBar
                                      style={
                                        resolvedScheme === "dark"
                                          ? "light"
                                          : "dark"
                                      }
                                      backgroundColor={theme.background}
                                    />
                                    <AppNavigator />
                                  </AppUpdateGate>
                                </BottomSheetProvider>
                              </ConfirmDialogProvider>
                            </BottomSheetModalProvider>
                          </AppProvider>
                        </AccountSecurityProvider>
                      </AppLockProvider>
                    </PushNotificationProvider>
                  </AuthProvider>
                </KeyboardProvider>
              </ToastProvider>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </NetworkProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
