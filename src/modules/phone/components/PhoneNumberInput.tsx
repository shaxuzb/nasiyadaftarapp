import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, type TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getExampleNumber } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";
import { KeyboardController } from "react-native-keyboard-controller";

import { AppInput } from "../../../components/AppInput";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import type { AppTheme } from "../../../types";
import { getCountryName } from "../data/countries";
import {
  callingCodeOf,
  flagOf,
  formatNational,
  readPhoneInput,
  type CountryCode,
  type PhoneValue,
} from "../utils/phoneNumber";
import { CountryPickerSheet } from "./CountryPickerSheet";

interface Props {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  label?: string;
  error?: string;
  variant?: "default" | "sheet";
  compact?: boolean;
  editable?: boolean;
  autoFocus?: boolean;
  inputRef?: React.Ref<TextInput>;
  returnKeyType?: React.ComponentProps<typeof AppInput>["returnKeyType"];
  submitBehavior?: React.ComponentProps<typeof AppInput>["submitBehavior"];
  onSubmitEditing?: () => void;
  /** After the number, inside the field: the contacts button, say. */
  trailingAccessory?: React.ReactNode;
}

/**
 * A phone number with its country: the flag and the fixed calling code on
 * the left ("🇺🇿 +998"), which open every country to choose from, and the
 * national number on the right, formatted the way that country writes it.
 *
 * Whatever is pasted is read through one rule (readPhoneInput): a whole
 * number with its "+" brings its own country, and the calling code typed or
 * pasted again after the fixed one is not counted twice.
 */
export function PhoneNumberInput({
  value,
  onChange,
  label,
  error,
  variant = "default",
  compact,
  editable = true,
  autoFocus,
  inputRef,
  returnKeyType,
  submitBehavior,
  onSubmitEditing,
  trailingAccessory,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { locale, t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  // The field keeps its own text while typing (no re-render of the text per
  // keystroke from outside); this writes a value set from outside into it.
  const [resetKey, setResetKey] = useState(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const emittedRef = useRef<PhoneValue>(value);
  const lastReadRef = useRef<PhoneValue | null>(null);

  const transformText = useCallback((text: string) => {
    const next = readPhoneInput(text, valueRef.current.country);
    lastReadRef.current = next;
    return formatNational(next);
  }, []);
  const handleChangeText = useCallback(() => {
    const next = lastReadRef.current ?? valueRef.current;
    emittedRef.current = next;
    onChange(next);
  }, [onChange]);

  // A country picked, a contact filled in, a form reset: none of them typed,
  // so the field is told.
  useEffect(() => {
    const emitted = emittedRef.current;
    if (emitted.country === value.country && emitted.digits === value.digits) return;
    emittedRef.current = value;
    setResetKey((key) => key + 1);
  }, [value]);

  const openPicker = useCallback(() => {
    void KeyboardController.dismiss();
    setPickerOpen(true);
  }, []);
  const closePicker = useCallback(() => setPickerOpen(false), []);
  const selectCountry = useCallback(
    (country: CountryCode) => {
      if (country === valueRef.current.country) return;
      onChange({ country, digits: valueRef.current.digits });
    },
    [onChange],
  );

  const placeholder = useMemo(() => {
    const example = getExampleNumber(value.country, examples);
    return example ? formatNational({ country: value.country, digits: example.nationalNumber }) : "";
  }, [value.country]);
  const callingCode = callingCodeOf(value.country);

  return (
    <>
      <AppInput
        label={label}
        error={error}
        variant={variant}
        compact={compact}
        uncontrolled
        defaultValue={formatNational(value)}
        inputResetKey={resetKey}
        transformText={transformText}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        editable={editable}
        autoFocus={autoFocus}
        inputRef={inputRef}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType={returnKeyType}
        submitBehavior={submitBehavior}
        onSubmitEditing={onSubmitEditing}
        leadingAccessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("phone.countryA11y", {
              name: getCountryName(value.country, locale),
              code: callingCode,
            })}
            accessibilityHint={t("phone.chooseCountry")}
            disabled={!editable}
            hitSlop={6}
            onPress={openPicker}
            style={({ pressed }) => [styles.country, pressed && styles.pressed]}
          >
            <Text style={styles.flag}>{flagOf(value.country)}</Text>
            <Text style={styles.code}>{callingCode}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.textMuted} />
            <View style={styles.divider} />
          </Pressable>
        }
        trailingAccessory={trailingAccessory}
      />
      {pickerOpen ? (
        <CountryPickerSheet selected={value.country} onSelect={selectCountry} onClose={closePicker} />
      ) : null}
    </>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    country: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      alignSelf: "stretch",
      paddingRight: 2,
    },
    pressed: { opacity: 0.6 },
    flag: { fontSize: 20, lineHeight: 26 },
    code: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
      fontVariant: ["tabular-nums"],
    },
    divider: {
      width: StyleSheet.hairlineWidth * 2,
      height: 22,
      marginLeft: 6,
      marginRight: 8,
      backgroundColor: theme.border,
    },
  });
