import React, { memo, useCallback, useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PrimaryButton } from "../../../components/PrimaryButton";
import { SearchBar } from "../../../components/SearchBar";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { flagOf } from "../../phone/utils/phoneNumber";

export interface SetupChoice {
  key: string;
  /** Country code whose flag is shown. */
  flag: string;
  title: string;
  subtitle?: string;
  /** Shown on the right, a currency's symbol say. */
  trailing?: string;
  /** Listed but not yet choosable: greyed out, with "coming soon". */
  disabled?: boolean;
}

interface Props {
  step: number;
  stepCount: number;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  choices: readonly SetupChoice[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  actionLabel: string;
  onAction: () => void;
  actionLoading?: boolean;
  onBack?: () => void;
}

/**
 * One step of first launch: where it is in the steps, what to choose and
 * why, a search, the choices (one at a time), and the button to go on. The
 * language and the currency are chosen on the same page, so the second step
 * is already familiar.
 */
export function SetupChoiceStep({
  step,
  stepCount,
  title,
  subtitle,
  searchPlaceholder,
  query,
  onQueryChange,
  choices,
  selectedKey,
  onSelect,
  actionLabel,
  onAction,
  actionLoading,
  onBack,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const renderChoice = useCallback(
    ({ item }: { item: SetupChoice }) => (
      <ChoiceRow
        choice={item}
        selected={item.key === selectedKey}
        onSelect={onSelect}
        soonLabel={t("setup.comingSoon")}
        theme={theme}
        styles={styles}
      />
    ),
    [onSelect, selectedKey, styles, t, theme],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.column}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.back")}
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.backButton} />
          )}
          {/* Where the user is: one bar per step, the done ones filled. */}
          <View
            style={styles.progress}
            accessibilityRole="progressbar"
            accessibilityLabel={t("setup.stepOf", { step, count: stepCount })}
          >
            {Array.from({ length: stepCount }, (_, index) => (
              <View key={index} style={[styles.progressBar, index < step && styles.progressBarDone]} />
            ))}
          </View>
          <Text style={styles.stepText}>{t("setup.stepOf", { step, count: stepCount })}</Text>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.search}>
          <SearchBar value={query} onChangeText={onQueryChange} placeholder={searchPlaceholder} />
        </View>

        <FlatList
          data={choices}
          keyExtractor={(choice) => choice.key}
          renderItem={renderChoice}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          accessibilityRole="radiogroup"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={26} color={theme.textMuted} />
              <Text style={styles.emptyText}>{t("setup.nothingFound")}</Text>
            </View>
          }
        />

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <PrimaryButton
            label={actionLabel}
            onPress={onAction}
            loading={actionLoading}
            disabled={!selectedKey}
          />
        </View>
      </View>
    </View>
  );
}

const ChoiceRow = memo(function ChoiceRow({
  choice,
  selected,
  onSelect,
  soonLabel,
  theme,
  styles,
}: {
  choice: SetupChoice;
  selected: boolean;
  onSelect: (key: string) => void;
  soonLabel: string;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: choice.disabled }}
      accessibilityLabel={[choice.title, choice.subtitle, choice.disabled ? soonLabel : null]
        .filter(Boolean)
        .join(", ")}
      disabled={choice.disabled}
      onPress={() => onSelect(choice.key)}
      style={({ pressed }) => [
        styles.row,
        selected && styles.rowSelected,
        choice.disabled && styles.rowDisabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.flagWrap}>
        <Text style={styles.flag}>{flagOf(choice.flag)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[styles.rowTitle, selected && styles.rowTitleSelected]} numberOfLines={1}>
          {choice.title}
        </Text>
        {choice.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {choice.subtitle}
          </Text>
        ) : null}
      </View>
      {choice.disabled ? (
        <View style={styles.soonBadge}>
          <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
          <Text style={styles.soonText}>{soonLabel}</Text>
        </View>
      ) : (
        <>
          {choice.trailing ? <Text style={styles.trailing}>{choice.trailing}</Text> : null}
          <View style={[styles.radio, selected && styles.radioSelected]}>
            {selected ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
          </View>
        </>
      )}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    root: { flex: 1, alignItems: "center", backgroundColor: theme.background },
    // A centred column on a tablet; the full width on a phone.
    column: { flex: 1, width: "100%", maxWidth: 560, paddingHorizontal: spacing.md },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
    },
    progress: { flex: 1, flexDirection: "row", gap: 6 },
    progressBar: {
      flex: 1,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    progressBarDone: { backgroundColor: theme.primary },
    stepText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
      minWidth: 40,
      textAlign: "right",
    },
    title: { ...typography.displayMedium, color: theme.text },
    subtitle: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      marginTop: spacing.xs,
    },
    search: { marginTop: spacing.lg, marginBottom: spacing.sm },
    list: { flex: 1 },
    listContent: { gap: spacing.sm, paddingVertical: spacing.sm },
    row: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    rowSelected: {
      borderWidth: 1.5,
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    rowDisabled: { opacity: 0.55 },
    pressed: { opacity: 0.75 },
    flagWrap: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    flag: { fontSize: 24, lineHeight: 30 },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { ...typography.bodyMedium, color: theme.text, fontWeight: "700" },
    rowTitleSelected: { color: theme.primary },
    rowSubtitle: { ...typography.caption, color: theme.textSecondary },
    trailing: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      fontWeight: "600",
      marginRight: 4,
    },
    radio: {
      width: 22,
      height: 22,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    radioSelected: { borderColor: theme.primary, backgroundColor: theme.primary },
    soonBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    soonText: { ...typography.caption, color: theme.textSecondary, fontWeight: "700" },
    empty: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xl },
    emptyText: { ...typography.bodyMedium, color: theme.textMuted },
    footer: { paddingTop: spacing.sm },
  });
