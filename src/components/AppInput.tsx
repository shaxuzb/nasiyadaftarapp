import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  Pressable,
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
  passwordToggle?: boolean;
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
  passwordToggle = false,
  secureTextEntry,
  ...rest
}: Props) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSheet = variant === "sheet";
  const hasPasswordToggle = passwordToggle && Boolean(secureTextEntry);
  const shouldHidePassword = hasPasswordToggle
    ? !passwordVisible
    : secureTextEntry;

  const borderColor = error
    ? theme.dangerColor
    : focused
      ? isSheet
        ? theme.primary
        : theme.primary
      : isSheet
        ? theme.border
        : theme.border;
  const inputStyle = [
    typography.bodyMedium,
    styles.input,
    process.env.EXPO_OS === "ios" ? styles.inputIOS : null,
    isSheet ? styles.sheetInput : null,
    { color: theme.text },
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
            { color: theme.textSecondary },
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
            backgroundColor: isSheet ? theme.surface : theme.inputBackground,
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
                  ? theme.primary
                  : theme.primary
                : isSheet
                  ? theme.textSecondary
                  : theme.textMuted
            }
            style={styles.icon}
          />
        ) : null}

        {mask ? (
          <MaskInput
            style={inputStyle}
            mask={mask}
            placeholderTextColor={theme.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={(masked, raw) => {
              onChangeText?.(masked);
              onChangeRawText?.(raw);
            }}
            secureTextEntry={shouldHidePassword}
            {...rest}
          />
        ) : isSheet ? (
          <BottomSheetTextInput
            style={inputStyle}
            placeholderTextColor={theme.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={onChangeText}
            secureTextEntry={shouldHidePassword}
            {...rest}
          />
        ) : (
          <TextInput
            style={inputStyle}
            placeholderTextColor={theme.textMuted}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChangeText={onChangeText}
            secureTextEntry={shouldHidePassword}
            {...rest}
          />
        )}

        {hasPasswordToggle ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? "Parolni yashirish" : "Parolni ko‘rsatish"
            }
            accessibilityState={{ expanded: passwordVisible }}
          >
            <Ionicons
              name={passwordVisible ? "eye-off-outline" : "eye-outline"}
              size={21}
              color={focused ? theme.primary : theme.textMuted}
            />
          </Pressable>
        ) : null}
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
  passwordToggle: {
    width: 44,
    height: 44,
    marginRight: -spacing.sm,
    alignItems: "center",
    justifyContent: "center",
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
