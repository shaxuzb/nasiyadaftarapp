import React, { useMemo } from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { typography } from "../theme";
import { AppTheme } from "../types";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  filterActive?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
  onFilterPress,
  filterActive = false,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: filterActive ? theme.primary : theme.border,
        },
      ]}
    >
      <Ionicons name="search-outline" size={24} color={theme.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Qidirish..."}
        placeholderTextColor={theme.textMuted}
        style={[typography.bodyMedium, styles.input, { color: theme.text }]}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Qidiruvni tozalash"
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.iconButton}
        >
          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
        </Pressable>
      ) : null}
      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Qarzdor mijozlarni filtrlash"
          accessibilityState={{ selected: filterActive }}
          onPress={onFilterPress}
          hitSlop={8}
          style={[
            styles.filterButton,
            filterActive && { backgroundColor: theme.primaryLight },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={23}
            color={filterActive ? theme.primary : theme.textSecondary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 18,
      paddingHorizontal: 16,
      height: 56,
      borderWidth: 1,
      boxShadow: theme.cardShadow,
    },
    input: {
      flex: 1,
      fontSize: 15,
      lineHeight: 21,
      paddingVertical: 0,
    },
    iconButton: {
      width: 28,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    filterButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
  });
