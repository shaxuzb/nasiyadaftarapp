import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, typography } from '../theme';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: '',
    type: 'info',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 30,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    });
  }, [opacity, translateY]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, message, type });

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(hideToast, 2200);
  }, [hideToast, opacity, translateY]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const toastBg = useMemo(() => {
    if (toast.type === 'success') return theme.successColor;
    if (toast.type === 'error') return theme.dangerColor;
    return theme.text;
  }, [theme, toast.type]);

  return (
      <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.visible ? (
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFillObject,
            { zIndex: 99999, elevation: 99999 },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.container,
              { bottom: Math.max(insets.bottom, spacing.md) + spacing.md },
            ]}
          >
            <Animated.View
              style={[
                styles.toast,
                {
                  backgroundColor: toastBg,
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            >
              <Text style={[typography.label, styles.text]}>{toast.message}</Text>
            </Animated.View>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  toast: {
    minWidth: 180,
    maxWidth: '90%',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
  },
});
