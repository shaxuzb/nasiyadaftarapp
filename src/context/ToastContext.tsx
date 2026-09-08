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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { getToastDismissDirection } from "./toastGesture";

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
const TOAST_HIDDEN_Y = -18;
const TOAST_EXIT_X = 420;
const TOAST_EXIT_Y = -140;

function getToastDuration(message: string): number {
  return Math.min(5000, Math.max(2600, message.length * 55));
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "info",
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceRef = useRef(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(TOAST_HIDDEN_Y);
  const opacity = useSharedValue(0);

  const finalizeToast = useCallback((sequence: number) => {
    if (sequence !== sequenceRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setToast((current) => ({ ...current, visible: false }));
  }, []);

  const hideToast = useCallback(
    (sequence = sequenceRef.current) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(opacity);

      const finishExit = (finished?: boolean) => {
        "worklet";
        if (finished) scheduleOnRN(finalizeToast, sequence);
      };

      translateX.set(
        withTiming(0, {
          duration: reduceMotion ? 1 : 180,
          easing: Easing.in(Easing.quad),
        }),
      );
      translateY.set(
        withTiming(TOAST_HIDDEN_Y, {
          duration: reduceMotion ? 1 : 180,
          easing: Easing.in(Easing.quad),
        }, finishExit),
      );
      opacity.set(
        withTiming(0, {
          duration: reduceMotion ? 1 : 160,
          easing: Easing.in(Easing.quad),
        }),
      );
    },
    [finalizeToast, opacity, reduceMotion, translateX, translateY],
  );

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const normalizedMessage = message.trim();
      if (!normalizedMessage) return;

      sequenceRef.current += 1;
      const sequence = sequenceRef.current;

      if (timerRef.current) clearTimeout(timerRef.current);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      translateX.set(0);
      translateY.set(TOAST_HIDDEN_Y);
      opacity.set(0);
      setToast({ visible: true, message: normalizedMessage, type });

      opacity.set(
        withTiming(1, {
          duration: reduceMotion ? 1 : 180,
          easing: Easing.out(Easing.cubic),
        }),
      );
      translateY.set(
        withTiming(0, {
          duration: reduceMotion ? 1 : 240,
          easing: Easing.out(Easing.cubic),
        }),
      );
      timerRef.current = setTimeout(
        () => hideToast(sequence),
        getToastDuration(normalizedMessage),
      );
    },
    [hideToast, opacity, reduceMotion, translateX, translateY],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
    },
    [opacity, translateX, translateY],
  );

  const toastAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
    ],
  }));

  const activeSequence = sequenceRef.current;
  const toastGesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(6)
        .onUpdate((event) => {
          const horizontalIntent =
            Math.abs(event.translationX) + Math.abs(event.velocityX) / 10;
          const verticalIntent =
            Math.abs(event.translationY) + Math.abs(event.velocityY) / 10;

          if (horizontalIntent >= verticalIntent) {
            translateX.set(event.translationX);
            translateY.set(0);
            opacity.set(
              Math.max(0.2, 1 - Math.abs(event.translationX) / 180),
            );
          } else {
            const upwardTranslation = Math.min(0, event.translationY);
            translateX.set(0);
            translateY.set(upwardTranslation);
            opacity.set(Math.max(0.2, 1 + upwardTranslation / 120));
          }
        })
        .onEnd((event) => {
          const direction = getToastDismissDirection(
            event.translationX,
            event.translationY,
            event.velocityX,
            event.velocityY,
          );

          if (direction) {
            const finishDismiss = (finished?: boolean) => {
              "worklet";
              if (finished) scheduleOnRN(finalizeToast, activeSequence);
            };

            if (direction === "up") {
              translateY.set(
                withTiming(
                  TOAST_EXIT_Y,
                  { duration: reduceMotion ? 1 : 180 },
                  finishDismiss,
                ),
              );
            } else {
              translateX.set(
                withTiming(
                  direction === "left" ? -TOAST_EXIT_X : TOAST_EXIT_X,
                  { duration: reduceMotion ? 1 : 180 },
                  finishDismiss,
                ),
              );
            }

            opacity.set(
              withTiming(0, { duration: reduceMotion ? 1 : 150 }),
            );
            return;
          }

          translateX.set(
            withSpring(0, {
              duration: reduceMotion ? 1 : 300,
              dampingRatio: 0.8,
              velocity: event.velocityX,
            }),
          );
          translateY.set(
            withSpring(0, {
              duration: reduceMotion ? 1 : 300,
              dampingRatio: 0.8,
              velocity: Math.min(0, event.velocityY),
            }),
          );
          opacity.set(
            withTiming(1, { duration: reduceMotion ? 1 : 160 }),
          );
        }),
    [activeSequence, finalizeToast, opacity, reduceMotion, translateX, translateY],
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
            pointerEvents="box-none"
            style={[
              styles.container,
              { top: Math.max(insets.top, spacing.sm) + spacing.xs },
            ]}
          >
            <GestureDetector gesture={toastGesture}>
              <Animated.View
                accessible
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={[
                  styles.toast,
                  toastAnimatedStyle,
                  {
                    backgroundColor: appearance.backgroundColor,
                    boxShadow: theme.cardShadow,
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
            </GestureDetector>
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
