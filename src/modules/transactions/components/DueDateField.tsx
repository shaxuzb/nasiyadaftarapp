import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardController } from "react-native-keyboard-controller";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBottomSheet, useBottomSheetBackHandler } from "../../../bottom-sheet";
import { DatePickerSheet } from "../../../bottom-sheet/sheets/DatePickerSheet";
import { useDismissSheetOnAppLock } from "../../../bottom-sheet/useDismissSheetOnAppLock";
import { useSheetFrameStyle } from "../../../hooks/useSheetFrameStyle";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { formatDateOnly } from "../../../i18n/calendarLabels";
import { radius } from "../../../theme";
import type { AppTheme } from "../../../types";
import { addDays, todayDateOnly, type DateOnly } from "../../../utils/dateOnly";
import { hapticTap } from "../../../utils/haptics";

interface DueDateToggleProps {
  value: DateOnly | null;
  onChange: (value: DateOnly | null) => void;
  disabled?: boolean;
}

/**
 * The due date, on one line beside a field's label.
 *
 * Unticked: a checkbox, "Qaytarish sanasi". Ticked: the box and the date as a
 * chip, as in the add-customer sheet; the chip opens the same calendar, for
 * days after today only. Ticking it opens the calendar at once, on a week
 * ahead.
 *
 * The calendar is its own sheet stacked on this one ("push"): the app's shared
 * sheet would take the place of the sheet this sits in, and what was typed
 * there with it.
 */
export function DueDateToggle({ value, onChange, disabled }: DueDateToggleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheetFrame = useSheetFrameStyle();
  const { openSheet } = useBottomSheet();
  const calendarRef = useRef<BottomSheetModal>(null);
  const calendar = useDismissSheetOnAppLock(calendarRef);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // Kept while the calendar is up, so it opens on the date it was given.
  const [pickerValue, setPickerValue] = useState<DateOnly | null>(null);
  const checked = value !== null;
  const tomorrow = addDays(todayDateOnly(), 1);

  // A pending "present after the keyboard went down", if any.
  const pendingOpen = useRef<(() => void) | null>(null);
  useEffect(() => () => pendingOpen.current?.(), []);

  const openCalendar = useCallback(
    (date: DateOnly) => {
      setPickerValue(date);
      pendingOpen.current?.();
      if (!KeyboardController.isVisible()) {
        calendar.present();
        return;
      }
      // The calendar has no field of its own: with the keyboard still up it
      // would open behind it. Put the keyboard away first, then present once
      // it is gone (or after a short fallback, should the event never come).
      let done = false;
      const present = () => {
        if (done) return;
        cancel();
        calendar.present();
      };
      const subscription = Keyboard.addListener("keyboardDidHide", present);
      const timer = setTimeout(present, 450);
      const cancel = () => {
        done = true;
        subscription.remove();
        clearTimeout(timer);
        pendingOpen.current = null;
      };
      pendingOpen.current = cancel;
      Keyboard.dismiss();
      void KeyboardController.dismiss();
    },
    [calendar],
  );

  const toggle = useCallback(() => {
    void hapticTap();
    if (checked) {
      onChange(null);
      return;
    }
    const start = addDays(todayDateOnly(), 7);
    onChange(start);
    openCalendar(start);
  }, [checked, onChange, openCalendar]);

  // Android back closes the calendar, not the sheet under it: added later,
  // this listener is asked first.
  useBottomSheetBackHandler(calendarOpen, calendar.dismiss);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.35} />
    ),
    [],
  );

  const dateLabel = value ? formatDateOnly(value, t) : "";

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        accessibilityLabel={t("transactions.dueDate")}
        disabled={disabled}
        hitSlop={10}
        onPress={toggle}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <View style={[styles.box, checked && styles.boxChecked]}>
          {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
        </View>
        {checked ? null : (
          <Text style={styles.toggleText} numberOfLines={1}>
            {t("transactions.dueDate")}
          </Text>
        )}
      </Pressable>

      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t("transactions.dueDate")}: ${dateLabel}`}
          disabled={disabled}
          hitSlop={6}
          onPress={() => openCalendar(value)}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <Ionicons name="calendar-outline" size={15} color={theme.primary} />
          <Text style={styles.chipText} numberOfLines={1}>
            {dateLabel}
          </Text>
          <Ionicons name="chevron-down" size={13} color={theme.primary} />
        </Pressable>
      ) : null}

      <BottomSheetModal
        ref={calendarRef}
        style={sheetFrame}
        index={0}
        enableDynamicSizing
        enablePanDownToClose
        stackBehavior="push"
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        onChange={(index) => setCalendarOpen(index >= 0)}
        onDismiss={() => {
          setCalendarOpen(false);
          calendar.handleDismissed();
        }}
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
      >
        {pickerValue ? (
          <DatePickerSheet
            closeSheet={calendar.dismiss}
            setDismissLocked={() => undefined}
            openSheet={openSheet}
            props={{
              value: pickerValue,
              minDate: tomorrow,
              title: t("transactions.dueDate"),
              onSelect: (date) => onChange(date),
            }}
          />
        ) : null}
      </BottomSheetModal>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
    toggle: { flexDirection: "row", alignItems: "center", gap: 6 },
    box: {
      width: 18,
      height: 18,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: theme.textMuted,
    },
    boxChecked: { borderColor: theme.primary, backgroundColor: theme.primary },
    toggleText: { fontSize: 12, lineHeight: 16, fontWeight: "600", color: theme.textSecondary },
    // As the add-customer sheet's date chip.
    chip: {
      maxWidth: 150,
      minHeight: 28,
      flexShrink: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    chipText: { flexShrink: 1, fontSize: 12, fontWeight: "700", color: theme.primary },
    pressed: { opacity: 0.72 },
  });
