import React, {
  memo,
  useCallback,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../../hooks/useTheme";
import { useSheetFrameStyle } from "../../../hooks/useSheetFrameStyle";
import { useTranslation } from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import {
  getPhoneCountries,
  POPULAR_PHONE_COUNTRIES,
  searchPhoneCountries,
  type PhoneCountry,
} from "../data/countries";
import type { CountryCode } from "../utils/phoneNumber";

interface Props {
  selected: CountryCode;
  onSelect: (country: CountryCode) => void;
  onClose: () => void;
}

type Row =
  | { kind: "header"; key: string; title: string }
  | { kind: "country"; key: string; country: PhoneCountry };

const SNAP_POINTS = ["88%"];

/**
 * Every country with its flag and calling code, to choose the one a phone
 * number belongs to. Mounted only while open.
 *
 * A bottom sheet inside a Modal of its own, so it comes up over whatever the
 * phone field sits in: a screen, another sheet, or a dialog.
 */
export function CountryPickerSheet({ selected, onSelect, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheetFrame = useSheetFrameStyle();
  const sheetRef = useRef<BottomSheet>(null);
  const chosenRef = useRef<CountryCode | null>(null);
  const [query, setQuery] = useState("");
  // Filtering 245 rows on every keystroke is cheap, but it need not hold up
  // the letter appearing in the field.
  const deferredQuery = useDeferredValue(query);

  const countries = useMemo(() => getPhoneCountries(locale), [locale]);
  const rows = useMemo<Row[]>(() => {
    if (deferredQuery.trim()) {
      return searchPhoneCountries(countries, deferredQuery).map((country) => ({
        kind: "country",
        key: country.code,
        country,
      }));
    }
    const popularCount = POPULAR_PHONE_COUNTRIES.length;
    return [
      { kind: "header", key: "popular", title: t("phone.popularCountries") },
      ...countries.slice(0, popularCount).map((country): Row => ({ kind: "country", key: country.code, country })),
      { kind: "header", key: "all", title: t("phone.allCountries") },
      ...countries.slice(popularCount).map((country): Row => ({ kind: "country", key: `all-${country.code}`, country })),
    ];
  }, [countries, deferredQuery, t]);

  const close = useCallback(() => sheetRef.current?.close(), []);
  const choose = useCallback((code: CountryCode) => {
    chosenRef.current = code;
    sheetRef.current?.close();
  }, []);
  // The choice is reported once the sheet has gone, so the field behind
  // re-formats without fighting the closing animation.
  const handleClosed = useCallback(() => {
    if (chosenRef.current) onSelect(chosenRef.current);
    onClose();
  }, [onClose, onSelect]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.4} />
    ),
    [],
  );
  const renderRow = useCallback(
    ({ item }: { item: Row }) =>
      item.kind === "header" ? (
        <Text style={styles.sectionTitle}>{item.title}</Text>
      ) : (
        <CountryRow
          country={item.country}
          selected={item.country.code === selected}
          onPress={choose}
          styles={styles}
          theme={theme}
        />
      ),
    [choose, selected, styles, theme],
  );

  return (
    <Modal transparent statusBarTranslucent animationType="none" visible onRequestClose={close}>
      <GestureHandlerRootView style={styles.fill}>
        <BottomSheet
          ref={sheetRef}
          index={0}
          snapPoints={SNAP_POINTS}
          enableDynamicSizing={false}
          enablePanDownToClose
          topInset={insets.top}
          style={sheetFrame}
          keyboardBehavior="extend"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.background}
          handleIndicatorStyle={styles.handle}
          onClose={handleClosed}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t("phone.chooseCountry")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              hitSlop={8}
              onPress={close}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={theme.textMuted} />
            <BottomSheetTextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("phone.searchCountry")}
              placeholderTextColor={theme.textMuted}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("common.clearSearch")}
                hitSlop={8}
                onPress={() => setQuery("")}
              >
                <Ionicons name="close-circle" size={18} color={theme.textMuted} />
              </Pressable>
            ) : null}
          </View>
          <BottomSheetFlatList
            data={rows}
            keyExtractor={(row: Row) => row.key}
            renderItem={renderRow}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={16}
            maxToRenderPerBatch={16}
            windowSize={7}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.lg }]}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="earth-outline" size={28} color={theme.textMuted} />
                <Text style={styles.emptyText}>{t("phone.noCountry")}</Text>
              </View>
            }
          />
        </BottomSheet>
      </GestureHandlerRootView>
    </Modal>
  );
}

const CountryRow = memo(function CountryRow({
  country,
  selected,
  onPress,
  styles,
  theme,
}: {
  country: PhoneCountry;
  selected: boolean;
  onPress: (code: CountryCode) => void;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${country.name}, ${country.callingCode}`}
      onPress={() => onPress(country.code)}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}
    >
      <Text style={styles.flag}>{country.flag}</Text>
      <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
        {country.name}
      </Text>
      <Text style={styles.code}>{country.callingCode}</Text>
      <View style={styles.check}>
        {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} /> : null}
      </View>
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    fill: { flex: 1 },
    background: { backgroundColor: theme.surface, borderRadius: 26 },
    handle: { backgroundColor: theme.textMuted },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
    },
    title: { flex: 1, ...typography.headingMedium, color: theme.text },
    closeButton: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    search: {
      height: 46,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    searchInput: {
      flex: 1,
      height: "100%",
      ...typography.bodyMedium,
      color: theme.text,
      paddingVertical: 0,
    },
    list: { paddingHorizontal: spacing.sm },
    sectionTitle: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    row: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.md,
    },
    rowSelected: { backgroundColor: theme.primaryLight },
    pressed: { opacity: 0.7 },
    flag: { fontSize: 24, lineHeight: 30 },
    name: { flex: 1, minWidth: 0, ...typography.bodyMedium, color: theme.text },
    nameSelected: { color: theme.primary, fontWeight: "700" },
    code: {
      ...typography.bodyMedium,
      color: theme.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    check: { width: 20, alignItems: "center" },
    empty: { alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xl },
    emptyText: { ...typography.bodyMedium, color: theme.textMuted },
  });
