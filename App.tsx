import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AppProvider }   from './src/context/AppContext';
import { ToastProvider } from './src/context/ToastContext';
import { AppNavigator }  from './src/navigation';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { lightTheme, darkTheme } from './src/theme';

const ONBOARDING_DONE_KEY = 'onboarding_done_v1';

export default function App() {
  const scheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
      setShowOnboarding(done !== '1');
      setLoading(false);
    })();
  }, []);

  async function handleFinishOnboarding() {
    await AsyncStorage.setItem(ONBOARDING_DONE_KEY, '1');
    setShowOnboarding(false);
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: scheme === 'dark' ? darkTheme.background : lightTheme.background,
        }}
      >
        <ActivityIndicator size="large" color={scheme === 'dark' ? darkTheme.primary : lightTheme.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AppProvider>
          <ToastProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            {showOnboarding ? (
              <OnboardingScreen onFinish={handleFinishOnboarding} />
            ) : (
              <AppNavigator />
            )}
          </ToastProvider>
        </AppProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
