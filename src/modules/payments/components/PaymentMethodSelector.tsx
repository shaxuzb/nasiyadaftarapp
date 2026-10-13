import React, { memo, useMemo } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeContext } from "../../../context/ThemeContext";
import { useTheme } from "../../../hooks/useTheme";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import type { PaymentProvider } from "../utils/paymentProviders";

interface ProviderLogo {
  light: ImageSourcePropType;
  dark: ImageSourcePropType;
  width: number;
  height: number;
}

// The providers' own logos, from cdn.payme.uz, docs.click.uz and click.uz,
// rendered to PNG at 1x/2x/3x. The sizes keep each one's proportions and give
// the two about the same visual weight side by side.
//
// Each has the artwork for a light tile and for a dark one. Payme's badge
// carries its own background, so one file serves both; Click's wordmark is
// black or white, and the wrong one would vanish into the tile.
//
// Which providers are offered is the server's list, not this table: a provider
// without artwork here still gets a tile, with its name in text.
const LOGOS = new Map<string, ProviderLogo>([
  [
    "payme",
    {
      light: require("../../../../assets/payments/payme.png"),
      dark: require("../../../../assets/payments/payme.png"),
      width: 64,
      height: 22,
    },
  ],
  [
    "click",
    {
      light: require("../../../../assets/payments/click.png"),
      dark: require("../../../../assets/payments/click-on-dark.png"),
      width: 78,
      height: 20,
    },
  ],
]);

interface Props {
  title: string;
  /** A line under the tiles, to say why the pay button is waiting. */
  hint?: string;
  providers: readonly PaymentProvider[];
  /** The chosen provider's code, or null while nothing is chosen. */
  value: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
}

/**
 * One compact tile per provider the server offers; exactly one can be chosen.
 * The tiles follow the theme, and each logo switches to the artwork made for
 * that ground.
 */
export const PaymentMethodSelector = memo(function PaymentMethodSelector({
  title,
  hint,
  providers,
  value,
  onChange,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const { resolvedScheme } = useThemeContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <View accessibilityRole="radiogroup" style={styles.row}>
        {providers.map((provider) => {
          const logo = LOGOS.get(provider.code);
          const selected = value === provider.code;
          return (
            <Pressable
              key={provider.code}
              accessibilityRole="radio"
              accessibilityLabel={provider.title}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(provider.code)}
              style={({ pressed }) => [
                styles.tile,
                selected && styles.tileSelected,
                pressed && styles.pressed,
                disabled && styles.disabled,
              ]}
            >
              {logo ? (
                <Image
                  source={logo[resolvedScheme]}
                  resizeMode="contain"
                  style={{ width: logo.width, height: logo.height }}
                />
              ) : (
                <Text style={styles.name} numberOfLines={1}>
                  {provider.title}
                </Text>
              )}
              {selected ? (
                <View style={styles.check}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    wrap: { gap: spacing.sm },
    title: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    // Two providers share the row; a third still fits on a phone, and more
    // wrap onto another row instead of shrinking the logos.
    row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    tile: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 104,
      height: 52,
      paddingHorizontal: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: theme.border,
      // White in the light theme; in the dark one a step lighter than the
      // sheet, so the tile still reads as a surface of its own.
      backgroundColor: theme.surfaceElevated,
    },
    tileSelected: { borderColor: theme.primary },
    name: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "800",
    },
    check: {
      position: "absolute",
      top: -7,
      right: -7,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.primary,
      // A ring in the sheet's colour, so the mark reads as sitting on the corner.
      borderWidth: 2,
      borderColor: theme.surface,
    },
    hint: { ...typography.caption, color: theme.textMuted },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.55 },
  });
