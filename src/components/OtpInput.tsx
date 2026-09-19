import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "../hooks/useTheme";
import { radius, spacing, typography } from "../theme";
import { extractOtpCode } from "../modules/auth/utils/otp";
import { getOtpAutofillConfig } from "../modules/auth/utils/otpInputConfig";
import { useTranslation } from "../i18n";

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
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [clipboardError, setClipboardError] = useState(false);

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

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardValue = await Clipboard.getStringAsync();
      const code = extractOtpCode(clipboardValue);

      if (!code || code.length !== length) {
        setClipboardError(true);
        return;
      }

      setClipboardError(false);
      onChange(code);
      inputRef.current?.focus();
    } catch {
      setClipboardError(true);
    }
  }, [length, onChange]);

  const cells = Array.from({ length }, (_, i) => normalized[i] ?? "");

  const handleInputChange = useCallback(
    (text: string) => {
      setClipboardError(false);
      onChange(text.replace(/\D/g, "").slice(0, length));
    },
    [length, onChange],
  );

  return (
    <View>
      {Platform.OS === "ios" ? (
        <TextInput
          ref={inputRef}
          value={normalized}
          onChangeText={handleInputChange}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          maxLength={length}
          accessibilityLabel={t("common.otpInput")}
          autoCorrect={false}
          spellCheck={false}
          {...getOtpAutofillConfig("ios")}
          selectionColor={theme.primary}
          style={[
            styles.iosInput,
            {
              color: theme.text,
              backgroundColor: theme.inputBackground,
              borderColor: normalized ? theme.primary : theme.border,
            },
          ]}
        />
      ) : (
        <View style={styles.inputSurface}>
          <View pointerEvents="none" style={styles.row}>
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
          <TextInput
            ref={inputRef}
            value={normalized}
            onChangeText={handleInputChange}
            keyboardType="number-pad"
            autoFocus={autoFocus}
            maxLength={length}
            accessibilityLabel={t("common.otpInput")}
            autoCorrect={false}
            spellCheck={false}
            {...getOtpAutofillConfig("android")}
            selectionColor="transparent"
            style={styles.autofillInput}
          />
        </View>
      )}

      {Platform.OS === "ios" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.pasteOtp")}
          onPress={() => void handlePasteFromClipboard()}
          style={styles.clipboardButton}
        >
          <Text style={[typography.label, { color: theme.primary }]}>
            {t("common.pasteFromClipboard")}
          </Text>
        </Pressable>
      ) : null}

      {clipboardError ? (
        <Text style={[styles.clipboardError, { color: theme.dangerColor }]}>
          {t("common.otpClipboardMissing")}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inputSurface: {
    position: "relative",
    minHeight: 52,
    width: "100%",
  },
  iosInput: {
    minHeight: 52,
    width: "100%",
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 8,
  },
  autofillInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 52,
    zIndex: 2,
    padding: 0,
    margin: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    color: "transparent",
    fontSize: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  clipboardButton: {
    alignSelf: "center",
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xs,
  },
  clipboardError: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 17,
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
