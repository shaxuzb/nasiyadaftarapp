import React, { useMemo, useRef, useState } from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../hooks/useTheme";
import { typography } from "../theme";
import { AppTheme } from "../types";
import { useTranslation } from "../i18n";

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
          borderColor: focused ? theme.primary : theme.border,
          borderWidth: focused ? 1.5 : 1,
        },
      ]}
    >
      <Pressable
        style={styles.inputArea}
        onPress={() => inputRef.current?.focus()}
      >
        <Ionicons name="search-outline" size={24} color={theme.textSecondary} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? t("common.search")}
          placeholderTextColor={theme.textMuted}
          style={[typography.bodyMedium, styles.input, { color: theme.text }]}
          clearButtonMode="while-editing"
          returnKeyType="search"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Pressable>
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.clearSearch")}
          onPress={() => onChangeText("")}
          hitSlop={8}
          style={styles.iconButton}
        >
          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
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
      borderRadius: 18,
      paddingHorizontal: 16,
      height: 50,
      borderWidth: 1,
      boxShadow: theme.cardShadow,
    },
    inputArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 48,
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
  });
