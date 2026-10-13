import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { TERMS_OF_SERVICE_URL } from "../../../config/legalLinks";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { useLinkOpener } from "../../support/hooks/useAppLinks";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Shown under the sentence when the user tried to go on without agreeing. */
  error?: string;
  disabled?: boolean;
}

const LINK_TOKEN = "{link}";

/**
 * "I have read the public offer and agree", with a round checkbox.
 *
 * The whole row ticks the box, so the target is as wide as the card. The name
 * of the document inside the sentence is a link of its own: tapping it opens
 * the offer and leaves the box as it was, so reading it is never mistaken for
 * agreeing to it.
 */
export const OfferConsent = memo(function OfferConsent({
  checked,
  onChange,
  error,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { open } = useLinkOpener();

  // The sentence is one translation with a slot for the link, because where
  // the document's name falls in it differs between languages.
  const linkLabel = t("organization.offerLinkLabel");
  const [before, after = ""] = t("organization.offerConsent").split(LINK_TOKEN);

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${before}${linkLabel}${after}`}
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onChange(!checked)}
        hitSlop={4}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <View
          style={[
            styles.box,
            checked && styles.boxChecked,
            !checked && error ? styles.boxError : null,
          ]}
        >
          {checked ? (
            <Ionicons name="checkmark" size={15} color="#FFFFFF" />
          ) : null}
        </View>
        <Text style={styles.text}>
          {before}
          <Text
            accessibilityRole="link"
            onPress={() =>
              void open({ key: "terms_of_service", url: TERMS_OF_SERVICE_URL })
            }
            suppressHighlighting
            style={styles.link}
          >
            {linkLabel}
          </Text>
          {after}
        </Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const BOX_SIZE = 22;

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: { gap: spacing.xs },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      minHeight: 44,
      paddingVertical: spacing.xs,
    },
    box: {
      width: BOX_SIZE,
      height: BOX_SIZE,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      borderWidth: 1.5,
      borderColor: theme.textMuted,
      backgroundColor: theme.surface,
    },
    boxChecked: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    boxError: { borderColor: theme.dangerColor },
    // The first line of text sits level with the middle of the box.
    text: {
      flex: 1,
      ...typography.bodySmall,
      lineHeight: BOX_SIZE,
      color: theme.textSecondary,
    },
    link: {
      color: theme.primary,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    error: {
      ...typography.caption,
      color: theme.dangerColor,
      // Under the sentence, not under the box.
      marginLeft: BOX_SIZE + spacing.sm,
    },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
