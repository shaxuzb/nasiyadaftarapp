import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import MaskInput, { Mask } from "react-native-mask-input";
import { useTheme } from "../hooks/useTheme";
import { spacing, radius, typography } from "../theme";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  mask?: Mask;
  onChangeRawText?: (raw: string) => void;
  variant?: "default" | "sheet";
}

export function AppInput({
  label,
  error,
  iconName,
  style,
  mask,
  onChangeText,
  onChangeRawText,
  variant = "default",
  ...rest
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const isSheet = variant === "sheet";

  const borderColor = error
    ? theme.dangerColor
    : focused
      ? isSheet
        ? "#0B5DEB"
        : theme.primary
      : isSheet
        ? "#DDE5EF"
        : theme.border;
  const inputStyle = [
    typography.bodyMedium,
    styles.input,
    process.env.EXPO_OS === "ios" ? styles.inputIOS : null,
    isSheet ? styles.sheetInput : null,
    { color: isSheet ? "#071426" : theme.text },
    style,
  ];

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text
          style={[
            typography.label,
            styles.label,
            isSheet ? styles.sheetLabel : null,
            { color: isSheet ? "#172A49" : theme.textSecondary },
          ]}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputRow,
          isSheet ? styles.sheetInputRow : null,
          {
            backgroundColor: isSheet ? "#FFFFFF" : theme.inputBackground,
            borderColor,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {iconName ? (
          <Ionicons
            name={iconName}
            size={18}
            color={
              focused
                ? isSheet
                  ? "#0B5DEB"
                  : theme.primary
                : isSheet
                  ? "#60728F"
                  : theme.textMuted
            }
            style={styles.icon}
          />
        ) : null}

        {mask ? (
          <MaskInput
            style={inputStyle}
            mask={mask}
            placeholderTextColor={isSheet ? "#8A98AC" : theme.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={(masked, raw) => {
              onChangeText?.(masked);
              onChangeRawText?.(raw);
            }}
            {...rest}
          />
        ) : isSheet ? (
          <BottomSheetTextInput
            style={inputStyle}
            placeholderTextColor="#8A98AC"
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={onChangeText}
            {...rest}
          />
        ) : (
          <TextInput
            style={inputStyle}
            placeholderTextColor={theme.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={onChangeText}
            {...rest}
          />
        )}
      </View>

      {error ? (
        <Text
          style={[
            typography.caption,
            styles.error,
            { color: theme.dangerColor },
          ]}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  inputIOS: {
    paddingVertical: 0,
  },
  sheetInputRow: {
    minHeight: 56,
    borderRadius: 15,
    borderCurve: "continuous",
  },
  sheetInput: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },
  sheetLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  error: {
    marginTop: spacing.xs,
    marginLeft: 2,
  },
});
