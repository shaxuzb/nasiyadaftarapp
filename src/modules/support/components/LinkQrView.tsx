import React, { memo, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../../hooks/useTheme";
import { useTranslation } from "../../../i18n";
import { radius, spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";
import { useLinkOpener } from "../hooks/useAppLinks";
import { getLinkHost } from "../utils/appLinks";
import { QrCode } from "./QrCode";

interface Props {
  /** What the link is, as the heading. */
  title: string;
  /** One line under the heading saying who it is for. */
  description: string;
  /** The address the code encodes and the button opens. */
  url: string;
  /** Back to whatever listed this link. */
  onBack: () => void;
}

// One fixed size: large enough to scan from an arm's length, and with its
// white margin and a sheet's sides it still fits a 320-point-wide phone.
// The window's width is deliberately not consulted: on a tablet a sheet is a
// centred column, far narrower than the window.
const QR_SIZE = 208;
const OPEN_KEY = "qr-link";

/**
 * A link as a QR code, for showing to someone else: the shop owner holds the
 * phone up and the customer scans it with their own. The button underneath
 * opens the same link on this phone.
 *
 * It is a step inside the sheet that listed the link, not a sheet of its own:
 * the arrow leads back to the list instead of closing everything.
 */
export const LinkQrView = memo(function LinkQrView({
  title,
  description,
  url,
  onBack,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { openingKey, open } = useLinkOpener();
  const opening = openingKey === OPEN_KEY;

  // What the code says, without the scheme: readable by a person.
  const address = useMemo(() => {
    const host = getLinkHost(url);
    const path = url.replace(/^https:\/\/[^/?#]+/i, "").replace(/[/?#]+$/, "");
    return host ? `${host}${path}` : url;
  }, [url]);

  return (
    <>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={onBack}
          hitSlop={6}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={21} color={theme.textSecondary} />
        </Pressable>
        <View style={styles.titleCopy}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.codeBlock}>
        <View style={styles.codeCard}>
          <QrCode
            value={url}
            size={QR_SIZE}
            accessibilityLabel={t("support.qrAccessibility", { title })}
          />
        </View>
        <Text style={styles.address} numberOfLines={1} selectable>
          {address}
        </Text>
        <Text style={styles.hint}>{t("support.qrHint")}</Text>
      </View>

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t("support.openInTelegram")}
        accessibilityState={{ disabled: opening, busy: opening }}
        disabled={opening}
        onPress={() => void open({ key: OPEN_KEY, url })}
        style={({ pressed }) => [
          styles.openButton,
          pressed && styles.pressed,
          opening && styles.dimmed,
        ]}
      >
        {opening ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
        )}
        <Text style={styles.openText}>{t("support.openInTelegram")}</Text>
      </Pressable>
    </>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    backButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    titleCopy: { flex: 1, gap: 2 },
    title: { ...typography.headingMedium, color: theme.text },
    subtitle: { ...typography.caption, color: theme.textSecondary },
    codeBlock: {
      alignItems: "center",
      gap: spacing.sm,
    },
    // The code brings its own white ground; this only frames it, so in the
    // dark theme the white square reads as a card and not as a hole.
    codeCard: {
      padding: 4,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "#FFFFFF",
    },
    address: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
      maxWidth: "100%",
    },
    hint: {
      ...typography.caption,
      color: theme.textSecondary,
      textAlign: "center",
    },
    openButton: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: theme.primary,
    },
    openText: {
      ...typography.bodyMedium,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    pressed: { opacity: 0.75 },
    dimmed: { opacity: 0.6 },
  });
