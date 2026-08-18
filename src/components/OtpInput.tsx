import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";

interface Props {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
}

export interface OtpInputHandle {
  focus: () => void;
}

export const OtpInput = forwardRef<OtpInputHandle, Props>(function OtpInput(
  { value, onChange, length = 6, autoFocus },
  forwardedRef,
) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);

  useImperativeHandle(
    forwardedRef,
    () => ({
      focus: () => inputRef.current?.focus(),
    }),
    [],
  );

  const normalized = useMemo(
    () => value.replace(/\D/g, "").slice(0, length),
    [length, value],
  );

  const cells = Array.from({ length }, (_, i) => normalized[i] ?? "");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="SMS tasdiqlash kodini kiritish"
      onPress={() => inputRef.current?.focus()}
    >
      <TextInput
        ref={inputRef}
        value={normalized}
        onChangeText={(text) =>
          onChange(text.replace(/\D/g, "").slice(0, length))
        }
        keyboardType="number-pad"
        autoFocus={autoFocus}
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        importantForAutofill="yes"
        caretHidden
        style={styles.hiddenInput}
      />
      <View style={styles.row}>
        {cells.map((char, idx) => (
          <View
            key={idx}
            style={[
              styles.cell,
              {
                borderColor: char ? theme.primary : theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
          >
            <Text style={[typography.headingSmall, { color: theme.text }]}>
              {char || ""}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  cell: {
    flex: 1,
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
