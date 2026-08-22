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
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardController } from "react-native-keyboard-controller";

import { useTheme } from "../hooks/useTheme";
import { BottomSheetContext } from "./context";
import { registerBackHandler } from "./backHandlerRegistry";
import { sheetRegistry } from "./registry";
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

export function BottomSheetProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const [activeEntry, setActiveEntry] = useState<ActiveSheetEntry | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeSheet = useCallback(() => {
    void KeyboardController.dismiss();
    modalRef.current?.dismiss();
  }, []);

  const openSheet = useCallback(
    <T extends SheetType>(type: T, props: SheetPropsMap[T]) => {
      if (
        isOpen &&
        isSamePayload(
          activeEntry,
          type,
          props as SheetPropsMap[SheetType],
        )
      ) {
        return;
      }

      setActiveEntry({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type,
        props: props as SheetPropsMap[SheetType],
      });
      requestAnimationFrame(() => modalRef.current?.present());
    },
    [activeEntry, isOpen],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.45}
      />
    ),
    [],
  );

  const handleChange = useCallback((index: number) => {
    setIsOpen(index >= 0);
  }, []);

  const handleDismiss = useCallback(() => {
    void KeyboardController.dismiss();
    setIsOpen(false);
    setActiveEntry(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    return registerBackHandler(() => {
      closeSheet();
      return true;
    });
  }, [closeSheet, isOpen]);

  const contextValue = useMemo<BottomSheetContextValue>(
    () => ({ openSheet, closeSheet, isOpen }),
    [closeSheet, isOpen, openSheet],
  );

  const activeDefinition = activeEntry ? sheetRegistry[activeEntry.type] : null;
  const ActiveComponent = activeDefinition?.component;

  return (
    <BottomSheetContext.Provider value={contextValue}>
      {children}
      {activeEntry && activeDefinition && ActiveComponent ? (
        <BottomSheetModal
          ref={modalRef}
          index={0}
          snapPoints={activeDefinition.snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={activeDefinition.enablePanDownToClose ?? true}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          enableBlurKeyboardOnGesture
          topInset={insets.top}
          onChange={handleChange}
          onDismiss={handleDismiss}
          backdropComponent={renderBackdrop}
          backgroundStyle={{ backgroundColor: theme.surface }}
          handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
        >
          <View style={[styles.container, { paddingBottom: insets.bottom }]}>
            <ActiveComponent
              closeSheet={closeSheet}
              props={activeEntry.props as never}
            />
          </View>
        </BottomSheetModal>
      ) : null}
    </BottomSheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
