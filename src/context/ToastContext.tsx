import { Ionicons } from "@expo/vector-icons";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";

type ToastType = "success" | "error" | "info";
type ToastIcon = React.ComponentProps<typeof Ionicons>["name"];

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function getToastDuration(message: string): number {
  return Math.min(5000, Math.max(2600, message.length * 55));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationRef = useRef<ReturnType<typeof Animated.parallel> | null>(
    null,
  );
  const sequenceRef = useRef(0);
  const translateY = useRef(new Animated.Value(-18)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const hideToast = useCallback(
    (sequence = sequenceRef.current) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      animationRef.current?.stop();
      const animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -18,
          duration: 180,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]);

      animationRef.current = animation;
      animation.start(({ finished }) => {
        if (finished && sequence === sequenceRef.current) {
          setToast((current) => ({ ...current, visible: false }));
        }
      });
    },
    [opacity, translateY],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const normalizedMessage = message.trim();
      if (!normalizedMessage) return;

      sequenceRef.current += 1;
      const sequence = sequenceRef.current;

      if (timerRef.current) clearTimeout(timerRef.current);
      animationRef.current?.stop();
      opacity.setValue(0);
      translateY.setValue(-18);
      setToast({ visible: true, message: normalizedMessage, type });

      const animation = Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      animationRef.current = animation;
      animation.start();
      timerRef.current = setTimeout(
        () => hideToast(sequence),
        getToastDuration(normalizedMessage),
      );
    },
    [hideToast, opacity, translateY],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      animationRef.current?.stop();
    },
    [],
  );

  const appearance = useMemo<{
    backgroundColor: string;
    icon: ToastIcon;
  }>(() => {
    if (toast.type === "success") {
      return {
        backgroundColor: theme.successColor,
        icon: "checkmark-circle-outline",
      };
    }
    if (toast.type === "error") {
      return {
        backgroundColor: theme.dangerColor,
        icon: "alert-circle-outline",
      };
    }
    return {
      backgroundColor: theme.primary,
      icon: "information-circle-outline",
    };
  }, [theme, toast.type]);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toast.visible ? (
        <View
          pointerEvents="box-none"
          style={[StyleSheet.absoluteFillObject, styles.overlay]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.container,
              { top: Math.max(insets.top, spacing.sm) + spacing.xs },
            ]}
          >
            <Animated.View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[
                styles.toast,
                {
                  backgroundColor: appearance.backgroundColor,
                  boxShadow: theme.cardShadow,
                  opacity,
                  transform: [{ translateY }],
                },
              ]}
            >
              <Ionicons
                name={appearance.icon}
                size={22}
                color="#FFFFFF"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text selectable style={[typography.label, styles.text]}>
                {toast.message}
              </Text>
            </Animated.View>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 99999,
    elevation: 99999,
  },
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.md,
  },
  toast: {
    width: "100%",
    maxWidth: 520,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderCurve: "continuous",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    flex: 1,
    color: "#FFFFFF",
  },
});
