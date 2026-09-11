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

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.otpInput")}
        onPress={() => inputRef.current?.focus()}
      >
        <TextInput
          ref={inputRef}
          value={normalized}
          onChangeText={(text) => {
            setClipboardError(false);
            onChange(text.replace(/\D/g, "").slice(0, length));
          }}
          keyboardType="number-pad"
          autoFocus={autoFocus}
          textContentType="oneTimeCode"
          autoComplete={Platform.OS === "ios" ? "one-time-code" : "sms-otp"}
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
