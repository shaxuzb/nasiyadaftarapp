import React, { memo, useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation, type TranslateKey } from "../../../i18n";
import { formatDateOnly, MONTH_KEYS, WEEKDAY_KEYS } from "../../../i18n/calendarLabels";
import { radius, spacing } from "../../../theme";
import type { AppTheme } from "../../../types";
import {
  addDays,
  addMonths,
  buildMonthGrid,
  compareMonths,
  monthOf,
  parseDateOnly,
  shiftMonth,
  todayDateOnly,
  type CalendarMonth,
  type DateOnly,
} from "../../../utils/dateOnly";
import { hapticTap } from "../../../utils/haptics";

/** The usual terms, one tap each; anything else from the calendar. */
const QUICK_TERMS: ReadonlyArray<{ labelKey: TranslateKey; resolve: (today: DateOnly) => DateOnly }> = [
  { labelKey: "transactions.dueWeek", resolve: (today) => addDays(today, 7) },
  { labelKey: "transactions.dueTwoWeeks", resolve: (today) => addDays(today, 14) },
  { labelKey: "transactions.dueMonth", resolve: (today) => addMonths(today, 1) },
];

/** Whole days from `from` to `to` (both date-only, local). */
function daysBetween(from: DateOnly, to: DateOnly): number {
  const a = parseDateOnly(from);
  const b = parseDateOnly(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

interface DueDateToggleProps {
  value: DateOnly | null;
  onChange: (value: DateOnly | null) => void;
  disabled?: boolean;
}

/**
 * The small checkbox beside a field's label: ticked, the debt gets a date to
 * be paid back by (a week ahead to start with); unticked, none.
 */
export function DueDateToggle({ value, onChange, disabled }: DueDateToggleProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const checked = value !== null;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={t("transactions.dueDate")}
      disabled={disabled}
      hitSlop={10}
      onPress={() => {
        void hapticTap();
        onChange(checked ? null : addDays(todayDateOnly(), 7));
      }}
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Ionicons name="checkmark" size={13} color="#FFFFFF" /> : null}
      </View>
      <Text style={[styles.toggleText, checked && styles.toggleTextChecked]} numberOfLines={1}>
        {t("transactions.dueDate")}
      </Text>
    </Pressable>
  );
}

interface DueDateFieldProps {
  value: DateOnly;
  onChange: (value: DateOnly) => void;
  disabled?: boolean;
}

/**
 * The date itself, once the box is ticked: the date and how far off it is,
 * the usual terms as chips, and a calendar that opens in place (another sheet
 * would take the place of this one). Only days after today can be chosen.
 */
export function DueDateField({ value, onChange, disabled }: DueDateFieldProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [today] = useState(todayDateOnly);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() => monthOf(value));
  const weeks = useMemo(() => buildMonthGrid(visibleMonth), [visibleMonth]);
  const canGoBack = compareMonths(visibleMonth, monthOf(tomorrow)) > 0;
  const days = daysBetween(today, value);

  const pick = useCallback(
    (date: DateOnly) => {
      void hapticTap();
      onChange(date);
    },
    [onChange],
  );

  const toggleCalendar = useCallback(() => {
    setVisibleMonth(monthOf(value));
    setCalendarOpen((open) => !open);
  }, [value]);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("transactions.dueChoose")}
        accessibilityState={{ expanded: calendarOpen, disabled }}
        disabled={disabled}
        onPress={toggleCalendar}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
      >
        <View style={styles.iconTile}>
          <Ionicons name="calendar-outline" size={19} color={theme.primary} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryLabel}>{t("transactions.dueDate")}</Text>
          <Text style={styles.summaryValue} numberOfLines={1}>
            {formatDateOnly(value, t)}
            {days > 0 ? <Text style={styles.summaryHint}>{`  ·  ${t("transactions.dueInDays", { count: days })}`}</Text> : null}
          </Text>
        </View>
        <Ionicons name={calendarOpen ? "chevron-up" : "chevron-down"} size={18} color={theme.textMuted} />
      </Pressable>

      <View style={styles.chips}>
        {QUICK_TERMS.map((term) => {
          const date = term.resolve(today);
          const active = date === value;
          return (
            <Pressable
              key={term.labelKey}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled }}
              disabled={disabled}
              onPress={() => {
                pick(date);
                setCalendarOpen(false);
              }}
              style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.pressed]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {t(term.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {calendarOpen ? (
        <View style={styles.calendar}>
          <View style={styles.navigator}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("calendar.previousMonth")}
              accessibilityState={{ disabled: !canGoBack }}
              disabled={!canGoBack}
              hitSlop={6}
              onPress={() => setVisibleMonth((month) => shiftMonth(month, -1))}
              style={({ pressed }) => [styles.navButton, !canGoBack && styles.dimmed, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </Pressable>
            <Text style={styles.heading}>{`${t(MONTH_KEYS[visibleMonth.month])} ${visibleMonth.year}`}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("calendar.nextMonth")}
              hitSlop={6}
              onPress={() => setVisibleMonth((month) => shiftMonth(month, 1))}
              style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </Pressable>
          </View>
          <View style={styles.weekRow}>
            {WEEKDAY_KEYS.map((key) => (
              <Text key={key} style={styles.weekday}>
                {t(key)}
              </Text>
            ))}
          </View>
          {weeks.map((week, index) => (
            <View key={index} style={styles.weekRow}>
              {week.map((cell, column) =>
                cell ? (
                  <Day
                    key={cell.date}
                    date={cell.date}
                    day={cell.day}
                    selected={cell.date === value}
                    disabled={!!disabled || cell.date < tomorrow}
                    label={formatDateOnly(cell.date, t)}
                    onPick={pick}
                    styles={styles}
                  />
                ) : (
                  <View key={`empty-${column}`} style={styles.dayCell} />
                ),
              )}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

const Day = memo(function Day({
  date,
  day,
  selected,
  disabled,
  label,
  onPick,
  styles,
}: {
  date: DateOnly;
  day: number;
  selected: boolean;
  disabled: boolean;
  label: string;
  onPick: (date: DateOnly) => void;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={() => onPick(date)}
      style={styles.dayCell}
    >
      {({ pressed }) => (
        <View style={[styles.dayBubble, selected && styles.dayBubbleSelected, pressed && !selected && styles.dayBubblePressed]}>
          <Text style={[styles.dayText, selected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>
            {day}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
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
    toggleTextChecked: { color: theme.primary },
    card: {
      gap: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      backgroundColor: theme.surface,
    },
    summary: { flexDirection: "row", alignItems: "center", gap: 10 },
    iconTile: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      backgroundColor: theme.primaryLight,
    },
    summaryCopy: { flex: 1, minWidth: 0 },
    summaryLabel: { fontSize: 11, lineHeight: 15, color: theme.textMuted },
    summaryValue: { fontSize: 15, lineHeight: 20, fontWeight: "700", color: theme.text },
    summaryHint: { fontSize: 12, fontWeight: "500", color: theme.textSecondary },
    chips: { flexDirection: "row", gap: 6 },
    chip: {
      flex: 1,
      minHeight: 34,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      borderRadius: radius.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
    },
    chipActive: { borderColor: theme.primary, backgroundColor: theme.primaryLight },
    chipText: { fontSize: 12, fontWeight: "600", color: theme.text },
    chipTextActive: { color: theme.primary, fontWeight: "700" },
    calendar: {
      paddingTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
    },
    navigator: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 6,
    },
    navButton: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    heading: { fontSize: 14, fontWeight: "700", color: theme.text },
    weekRow: { flexDirection: "row" },
    weekday: {
      flex: 1,
      paddingVertical: 4,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "600",
      color: theme.textMuted,
    },
    dayCell: { flex: 1, height: 38, alignItems: "center", justifyContent: "center" },
    dayBubble: {
      width: 34,
      height: 34,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
    },
    dayBubbleSelected: { backgroundColor: theme.primary },
    dayBubblePressed: { backgroundColor: theme.primaryLight },
    dayText: { fontSize: 14, color: theme.text, fontVariant: ["tabular-nums"] },
    dayTextSelected: { color: "#FFFFFF", fontWeight: "700" },
    dayTextDisabled: { color: theme.textMuted, opacity: 0.4 },
    dimmed: { opacity: 0.4 },
    pressed: { opacity: 0.72 },
  });
