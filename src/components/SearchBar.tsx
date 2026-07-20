import React from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { typography } from '../theme';

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

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: filterActive ? "#0B5DEB" : "#DCE5F0",
        },
      ]}
    >
      <Ionicons name="search-outline" size={24} color="#60708A" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? "Qidirish..."}
        placeholderTextColor="#71809A"
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
          <Ionicons name="close-circle" size={20} color="#71809A" />
        </Pressable>
      ) : null}
      {onFilterPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Qarzdor mijozlarni filtrlash"
          accessibilityState={{ selected: filterActive }}
          onPress={onFilterPress}
          hitSlop={8}
          style={[styles.filterButton, filterActive && styles.filterButtonActive]}
        >
          <Ionicons
            name="options-outline"
            size={23}
            color={filterActive ? "#0B5DEB" : "#53637C"}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection:     'row',
    alignItems:        'center',
    gap: 12,
    borderRadius:      18,
    paddingHorizontal: 16,
    height:            56,
    borderWidth:       1,
    boxShadow: "0 5px 18px rgba(22, 52, 112, 0.08)",
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
  filterButtonActive: {
    backgroundColor: "#EAF2FF",
  },
});
