import React, {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
} from "@gorhom/bottom-sheet";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardController } from "react-native-keyboard-controller";

import { ConfirmDialogProvider } from "../context/ConfirmDialogContext";
import { useTheme } from "../hooks/useTheme";
import { BottomSheetContext } from "./context";
import { registerBackHandler } from "./backHandlerRegistry";
import { sheetRegistry } from "./registry";
import { useBottomSheetBackHandler } from "./useBottomSheetBackHandler";
import {
  ActiveSheetEntry,
  BottomSheetContextValue,
  SheetPropsMap,
  SheetType,
} from "./types";

function isSamePayload(
  active: ActiveSheetEntry | null,
  type: SheetType,
  props: SheetPropsMap[SheetType],
) {
  if (!active || active.type !== type) return false;

  try {
    return JSON.stringify(active.props) === JSON.stringify(props);
  } catch {
    return false;
  }
}

function SheetPassthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const modalRef = useRef<BottomSheetModal>(null);
  const [activeEntry, setActiveEntry] = useState<ActiveSheetEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissLocked, setLocked] = useState(false);
  const dismissLockedRef = useRef(false);
  const setDismissLocked = useCallback((locked: boolean) => {
    dismissLockedRef.current = locked;
    setLocked(locked);
  }, []);
  const afterDismissRef = useRef<(() => void) | undefined>(undefined);
  const openRequestRef = useRef(0);

  const closeSheet = useCallback((afterDismiss?: () => void) => {
    if (dismissLockedRef.current) return;
    afterDismissRef.current = afterDismiss;
    void KeyboardController.dismiss();
    modalRef.current?.dismiss();
  }, []);

  const openSheet = useCallback(
    <T extends SheetType>(type: T, props: SheetPropsMap[T]) => {
      if (dismissLockedRef.current) return;
      if (
        isOpen &&
        isSamePayload(activeEntry, type, props as SheetPropsMap[SheetType])
      ) {
        return;
      }

      // Dismiss any search keyboard before mounting the sheet's keyboard listeners.
      const request = ++openRequestRef.current;
      const activateSheet = () => {
        if (request !== openRequestRef.current) return;
        setDismissLocked(false);
        afterDismissRef.current = undefined;
        setActiveEntry({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type,
          props: props as SheetPropsMap[SheetType],
        });
      };

      if (sheetRegistry[type].dismissKeyboardOnOpen === false) {
        requestAnimationFrame(activateSheet);
        return;
      }

      void KeyboardController.dismiss().then(activateSheet);
    },
    [activeEntry, isOpen],
  );

  useEffect(() => {
    if (!activeEntry) return;
    // Present only after React has committed the modal ref and its providers.
    const frame = requestAnimationFrame(() => modalRef.current?.present());
    return () => cancelAnimationFrame(frame);
  }, [activeEntry]);

  useEffect(
    () => () => {
      openRequestRef.current += 1;
    },
    [],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior={dismissLocked ? "none" : "close"}
        opacity={0.45}
      />
    ),
    [dismissLocked],
  );

  const handleChange = useCallback((index: number) => {
    setIsOpen(index >= 0);
  }, []);

  const handleDismiss = useCallback(() => {
    void KeyboardController.dismiss();
    setIsOpen(false);
    setActiveEntry(null);
    setDismissLocked(false);
    const afterDismiss = afterDismissRef.current;
    afterDismissRef.current = undefined;
    afterDismiss?.();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    return registerBackHandler(() => {
      closeSheet();
      return true;
    });
  }, [closeSheet, isOpen]);

  // Register while the modal is open so Android consumes back before the
  // navigation container can pop the current screen.
  useBottomSheetBackHandler(isOpen, closeSheet);

  const contextValue = useMemo<BottomSheetContextValue>(
    () => ({ openSheet, closeSheet, isOpen }),
    [closeSheet, isOpen, openSheet],
  );

  const activeDefinition = activeEntry ? sheetRegistry[activeEntry.type] : null;
  const ActiveComponent = activeDefinition?.component;
  const ActiveProvider = activeDefinition?.provider ?? SheetPassthrough;

  return (
    <BottomSheetContext.Provider value={contextValue}>
      {children}
      {activeEntry && activeDefinition && ActiveComponent ? (
        <ActiveProvider
          key={activeEntry.id}
          props={activeEntry.props as never}
          openSheet={openSheet}
          closeSheet={closeSheet}
          setDismissLocked={setDismissLocked}
        >
          <BottomSheetModal
            ref={modalRef}
            index={0}
            snapPoints={activeDefinition.snapPoints}
            enableDynamicSizing={activeDefinition.enableDynamicSizing ?? false}
            maxDynamicContentSize={Math.max(1, height - insets.top - 16)}
            enablePanDownToClose={
              !dismissLocked && (activeDefinition.enablePanDownToClose ?? true)
            }
            enableHandlePanningGesture={!dismissLocked}
            enableContentPanningGesture={
              activeEntry.type !== "transaction" && !dismissLocked
            }
            // Keep the sheet anchored above the keyboard instead of expanding it
            // to the whole screen. This matches the native messaging UX.
            keyboardBehavior="interactive"
            keyboardBlurBehavior="restore"
            // The app uses edge-to-edge on Android, where adjustResize behaves
            // like adjustNothing. Let the sheet apply the keyboard offset itself.
            android_keyboardInputMode="adjustPan"
            enableBlurKeyboardOnGesture
            topInset={insets.top}
            onChange={handleChange}
            onDismiss={handleDismiss}
            backdropComponent={renderBackdrop}
            backgroundStyle={{ backgroundColor: theme.surface }}
            handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
          >
            <ConfirmDialogProvider>
              <BottomSheetContext.Provider value={contextValue}>
                {activeDefinition.enableDynamicSizing ? (
                  <ActiveComponent
                    closeSheet={closeSheet}
                    setDismissLocked={setDismissLocked}
                    openSheet={openSheet}
                    props={activeEntry.props as never}
                  />
                ) : (
                  <View
                    style={[styles.container, { paddingBottom: insets.bottom }]}
                  >
                    <ActiveComponent
                      closeSheet={closeSheet}
                      setDismissLocked={setDismissLocked}
                      openSheet={openSheet}
                      props={activeEntry.props as never}
                    />
                  </View>
                )}
              </BottomSheetContext.Provider>
            </ConfirmDialogProvider>
          </BottomSheetModal>
        </ActiveProvider>
      ) : null}
    </BottomSheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
