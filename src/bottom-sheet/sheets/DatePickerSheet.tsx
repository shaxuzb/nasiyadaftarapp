import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { useTranslation, type TranslateKey } from "../../i18n";
import {
  formatDateOnly,
  MONTH_KEYS,
  MONTH_SHORT_KEYS,
  WEEKDAY_KEYS,
} from "../../i18n/calendarLabels";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  compareMonths,
  monthOf,
  shiftMonth,
  todayDateOnly,
  type CalendarCell,
  type CalendarMonth,
  type DateOnly,
} from "../../utils/dateOnly";
import { hapticTap } from "../../utils/haptics";
import type { SheetRenderProps } from "../types";

const QUICK_PICKS: ReadonlyArray<{
  labelKey: TranslateKey;
  resolve: (today: DateOnly) => DateOnly;
}> = [
  { labelKey: "calendar.today", resolve: (today) => today },
  { labelKey: "calendar.yesterday", resolve: (today) => addDays(today, -1) },
  { labelKey: "calendar.weekAgo", resolve: (today) => addDays(today, -7) },
  { labelKey: "calendar.monthAgo", resolve: (today) => addMonths(today, -1) },
];

type Mode = "days" | "months";

type Styles = ReturnType<typeof createStyles>;

export function DatePickerSheet({
  closeSheet,
  props,
}: SheetRenderProps<"datePicker">) {
  const { value, title, onSelect } = props;
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Read once: the sheet is short-lived, and a day rolling over mid-selection
  // is not worth a timer.
  const [today] = useState(todayDateOnly);
  const maxDate = props.maxDate ?? today;
  const maxMonth = useMemo(() => monthOf(maxDate), [maxDate]);

  const [mode, setMode] = useState<Mode>("days");
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    monthOf(value),
  );

  const weeks = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const canGoForward =
    mode === "days"
      ? compareMonths(visibleMonth, maxMonth) < 0
      : visibleMonth.year < maxMonth.year;

  const select = useCallback(
    (date: DateOnly) => {
      void hapticTap();
      onSelect(date);
      closeSheet();
    },
    [closeSheet, onSelect],
  );

  const step = useCallback(
    (direction: -1 | 1) => {
      setVisibleMonth((current) =>
        shiftMonth(current, mode === "days" ? direction : direction * 12),
      );
    },
    [mode],
  );

  const pickMonth = useCallback((month: number) => {
    setVisibleMonth((current) => ({ year: current.year, month }));
    setMode("days");
  }, []);

  const heading =
    mode === "days"
      ? `${t(MONTH_KEYS[visibleMonth.month])} ${visibleMonth.year}`
      : String(visibleMonth.year);

  return (
    <BottomSheetView
      // Android keeps its navigation bar or gesture handle along the bottom
      // edge; without this the last week of the grid sits underneath it.
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <View style={styles.iconWrap}>
            <Ionicons name="calendar-outline" size={21} color={theme.primary} />
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => closeSheet()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={21} color={theme.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.quickPicks}>
        {QUICK_PICKS.map((pick) => {
          const date = pick.resolve(today);
          const active = date === value;
          return (
            <Pressable
              key={pick.labelKey}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => select(date)}
              style={({ pressed }) => [
                styles.quickPick,
                active && styles.quickPickActive,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[styles.quickPickText, active && styles.quickPickTextActive]}
                numberOfLines={1}
              >
                {t(pick.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.navigator}>
        <NavButton
          icon="chevron-back"
          label={t(mode === "days" ? "calendar.previousMonth" : "calendar.previousYear")}
          onPress={() => step(-1)}
          styles={styles}
          color={theme.text}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("calendar.chooseMonth")}
          accessibilityState={{ expanded: mode === "months" }}
          onPress={() => setMode((current) => (current === "days" ? "months" : "days"))}
          style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
        >
          <Text style={styles.headingText}>{heading}</Text>
          <Ionicons
            name={mode === "days" ? "chevron-down" : "chevron-up"}
            size={16}
            color={theme.textSecondary}
          />
        </Pressable>
        <NavButton
          icon="chevron-forward"
          label={t(mode === "days" ? "calendar.nextMonth" : "calendar.nextYear")}
          onPress={() => step(1)}
          disabled={!canGoForward}
          styles={styles}
          color={theme.text}
        />
      </View>

      {mode === "days" ? (
        <View>
          <View style={styles.weekRow}>
            {WEEKDAY_KEYS.map((key) => (
              <Text key={key} style={styles.weekday}>
                {t(key)}
              </Text>
            ))}
          </View>
          {weeks.map((week, index) => (
            <View key={index} style={styles.weekRow}>
              {week.map((cell, column) => (
                <DayCell
                  key={cell?.date ?? `empty-${column}`}
                  cell={cell}
                  selected={cell?.date === value}
                  isToday={cell?.date === today}
                  disabled={cell !== null && cell.date > maxDate}
                  accessibilityLabel={cell ? formatDateOnly(cell.date, t) : ""}
                  onSelect={select}
                  styles={styles}
                />
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.monthGrid}>
          {MONTH_SHORT_KEYS.map((key, month) => {
            const disabled =
              compareMonths({ year: visibleMonth.year, month }, maxMonth) > 0;
            const active =
              monthOf(value).year === visibleMonth.year &&
              monthOf(value).month === month;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${t(MONTH_KEYS[month])} ${visibleMonth.year}`}
                accessibilityState={{ disabled, selected: active }}
                disabled={disabled}
                onPress={() => pickMonth(month)}
                style={({ pressed }) => [
                  styles.monthCell,
                  active && styles.monthCellActive,
                  disabled && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.monthText, active && styles.monthTextActive]}>
                  {t(key)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </BottomSheetView>
  );
}

function NavButton({
  icon,
  label,
  onPress,
  disabled = false,
  styles,
  color,
}: {
  icon: "chevron-back" | "chevron-forward";
  label: string;
  onPress: () => void;
  disabled?: boolean;
  styles: Styles;
  color: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.navButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

// Memoized with a stable onSelect and per-month cell objects, so moving the
// selection or paging re-renders only the cells whose flags actually changed.
const DayCell = memo(function DayCell({
  cell,
  selected,
  isToday,
  disabled,
  accessibilityLabel,
  onSelect,
  styles,
}: {
  cell: CalendarCell;
  selected: boolean;
  isToday: boolean;
  disabled: boolean;
  accessibilityLabel: string;
  onSelect: (date: DateOnly) => void;
  styles: Styles;
}) {
  if (!cell) return <View style={styles.dayCell} />;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(cell.date)}
      style={styles.dayCell}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.dayBubble,
            isToday && !selected && styles.dayBubbleToday,
            selected && styles.dayBubbleSelected,
            pressed && !selected && styles.dayBubblePressed,
          ]}
        >
          <Text
            style={[
              styles.dayText,
              selected && styles.dayTextSelected,
              disabled && styles.dayTextDisabled,
            ]}
          >
            {cell.day}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconWrap: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    title: { flex: 1, ...typography.headingMedium, color: theme.text },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    quickPicks: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
    quickPick: {
      minHeight: 34,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    quickPickActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    quickPickText: {
      ...typography.caption,
      color: theme.text,
      fontWeight: "600",
    },
    quickPickTextActive: { color: theme.primary },
    navigator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    navButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    heading: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: radius.sm,
    },
    headingText: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    weekRow: { flexDirection: "row" },
    weekday: {
      flex: 1,
      paddingBottom: spacing.xs,
      textAlign: "center",
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "600",
    },
    dayCell: {
      flex: 1,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },
    dayBubble: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
    },
    dayBubbleToday: { borderWidth: 1.5, borderColor: theme.primary },
    dayBubbleSelected: { backgroundColor: theme.primary },
    dayBubblePressed: { backgroundColor: theme.primaryLight },
    dayText: {
      ...typography.bodyMedium,
      color: theme.text,
      fontVariant: ["tabular-nums"],
    },
    dayTextSelected: { color: theme.surface, fontWeight: "700" },
    dayTextDisabled: { color: theme.textMuted, opacity: 0.45 },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: spacing.xs,
    },
    monthCell: {
      width: "33.333%",
      height: 48,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
    },
    monthCellActive: { backgroundColor: theme.primaryLight },
    monthText: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    monthTextActive: { color: theme.primary, fontWeight: "700" },
    disabled: { opacity: 0.4 },
    pressed: { opacity: 0.72 },
  });
