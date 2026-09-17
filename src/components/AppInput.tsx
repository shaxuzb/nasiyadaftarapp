import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { useTranslation } from "../i18n";
import { spacing, radius, typography } from "../theme";

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  mask?: Mask;
  onChangeRawText?: (raw: string) => void;
  variant?: "default" | "sheet";
  passwordToggle?: boolean;
  compact?: boolean;
  /** Keeps high-frequency formatted input state inside the native input. */
  uncontrolled?: boolean;
  /** Optional formatter used by the local input before notifying the parent. */
  transformText?: (value: string, previousValue: string) => string;
  /** Updates a locally-controlled input without remounting its native view. */
  inputResetKey?: string | number;
  trailingAccessory?: React.ReactNode;
  inputRef?: React.Ref<TextInput>;
}

interface LocalTextInputProps extends Omit<
  TextInputProps,
  "value" | "defaultValue" | "onChangeText"
> {
  InputComponent: React.ElementType;
  initialValue: string;
  inputRef: React.Ref<TextInput>;
  onChangeText?: (value: string) => void;
  transformText?: (value: string, previousValue: string) => string;
  resetKey?: string | number;
}

const LocalTextInput = React.memo(
  function LocalTextInput({
    InputComponent,
    initialValue,
    inputRef,
    onChangeText,
    transformText,
    resetKey,
    ...rest
  }: LocalTextInputProps) {
    const [value, setValue] = useState(initialValue);
    const valueRef = useRef(initialValue);
    const initialValueRef = useRef(initialValue);
    initialValueRef.current = initialValue;

    useEffect(() => {
      if (resetKey === undefined) return;
      const nextValue = initialValueRef.current;
      valueRef.current = nextValue;
      setValue(nextValue);
    }, [resetKey]);

    const handleChangeText = useCallback(
      (nextValue: string) => {
        const formattedValue = transformText
          ? transformText(nextValue, valueRef.current)
          : nextValue;
        valueRef.current = formattedValue;
        setValue(formattedValue);
        onChangeText?.(formattedValue);
      },
      [onChangeText, transformText],
    );

    return (
      <InputComponent
        {...rest}
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
      />
    );
  },
  (previous, next) => {
    // `initialValue` is intentionally ignored after mount. A parent state
    // update must never overwrite the value currently being edited.
    const { initialValue: _previousInitial, ...previousRest } = previous;
    const { initialValue: _nextInitial, ...nextRest } = next;
    return Object.keys(previousRest).every(
      (key) =>
        previousRest[key as keyof typeof previousRest] ===
        nextRest[key as keyof typeof nextRest],
    );
  },
);

interface LocalMaskInputProps extends Omit<
  React.ComponentProps<typeof MaskInput>,
  "value" | "defaultValue" | "onChangeText" | "mask"
> {
  initialValue: string;
  inputRef: React.Ref<TextInput>;
  mask: Mask;
  onChangeText?: (value: string) => void;
  onChangeRawText?: (raw: string) => void;
}

const LocalMaskInput = React.memo(
  function LocalMaskInput({
    initialValue,
    inputRef,
    mask,
    onChangeText,
    onChangeRawText,
    ...rest
  }: LocalMaskInputProps) {
    const [value, setValue] = useState(initialValue);

    const handleChangeText = useCallback(
      (masked: string, raw: string) => {
        setValue(masked);
        onChangeText?.(masked);
        onChangeRawText?.(raw);
      },
      [onChangeRawText, onChangeText],
    );

    return (
      <MaskInput
        {...rest}
        ref={inputRef}
        mask={mask}
        value={value}
        onChangeText={handleChangeText}
      />
    );
  },
  (previous, next) => {
    const { initialValue: _previousInitial, ...previousRest } = previous;
    const { initialValue: _nextInitial, ...nextRest } = next;
    return Object.keys(previousRest).every(
      (key) =>
        previousRest[key as keyof typeof previousRest] ===
        nextRest[key as keyof typeof nextRest],
    );
  },
);

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
  compact = false,
  uncontrolled = false,
  transformText,
  inputResetKey,
  trailingAccessory,
  inputRef,
  secureTextEntry,
  value,
  defaultValue,
  ...rest
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const nativeInputRef = useRef<TextInput>(null);
  const setInputRef = useCallback(
    (instance: TextInput | null | undefined) => {
      nativeInputRef.current = instance ?? null;
      if (typeof inputRef === "function") return inputRef(instance ?? null);
      if (inputRef) inputRef.current = instance ?? null;
    },
    [inputRef],
  );
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSheet = variant === "sheet";
  const hasPasswordToggle = passwordToggle && Boolean(secureTextEntry);
  const shouldHidePassword = hasPasswordToggle
    ? !passwordVisible
    : secureTextEntry;
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);
  const initialValue =
    typeof value === "string"
      ? value
      : typeof defaultValue === "string"
        ? defaultValue
        : "";

  const borderColor = error
    ? theme.dangerColor
    : focused
      ? isSheet
        ? theme.primary
        : theme.primary
      : isSheet
        ? theme.border
        : theme.border;
  const inputStyle = useMemo(
    () => [
      typography.bodyMedium,
      styles.input,
      process.env.EXPO_OS === "ios" ? styles.inputIOS : null,
      isSheet ? styles.sheetInput : null,
      { color: theme.text },
      style,
    ],
    [
      isSheet,
      style,
      styles.input,
      styles.inputIOS,
      styles.sheetInput,
      theme.text,
    ],
  );

  return (
    <View style={[styles.wrapper, compact && styles.compactWrapper]}>
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

      <Pressable
        onPress={() => nativeInputRef.current?.focus()}
        style={[
          styles.inputRow,
          isSheet ? styles.sheetInputRow : null,
          compact && styles.compactInputRow,
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

        {mask && uncontrolled ? (
          <LocalMaskInput
            initialValue={initialValue}
            inputRef={setInputRef}
            mask={mask}
            style={inputStyle}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            onChangeRawText={onChangeRawText}
            secureTextEntry={shouldHidePassword}
            {...rest}
          />
        ) : !mask && uncontrolled ? (
          <LocalTextInput
            InputComponent={isSheet ? BottomSheetTextInput : TextInput}
            initialValue={initialValue}
            inputRef={setInputRef}
            style={inputStyle}
            resetKey={inputResetKey}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            transformText={transformText}
            secureTextEntry={shouldHidePassword}
            {...rest}
          />
        ) : mask ? (
          <MaskInput
            ref={setInputRef}
            style={inputStyle}
            mask={mask}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={(masked, raw) => {
              onChangeText?.(masked);
              onChangeRawText?.(raw);
            }}
            secureTextEntry={shouldHidePassword}
            value={value}
            defaultValue={defaultValue}
            {...rest}
          />
        ) : isSheet ? (
          <BottomSheetTextInput
            ref={setInputRef}
            style={inputStyle}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            secureTextEntry={shouldHidePassword}
            value={value}
            defaultValue={defaultValue}
            {...rest}
          />
        ) : (
          <TextInput
            ref={setInputRef}
            style={inputStyle}
            placeholderTextColor={theme.textMuted}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            secureTextEntry={shouldHidePassword}
            value={value}
            defaultValue={defaultValue}
            {...rest}
          />
        )}

        {trailingAccessory}
        {hasPasswordToggle ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.passwordToggle}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible
                ? t("common.passwordHide")
                : t("common.passwordShow")
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
      </Pressable>

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
  compactWrapper: {
    marginBottom: 0,
  },
  compactInputRow: {
    minHeight: 50,
    borderRadius: 13,
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
