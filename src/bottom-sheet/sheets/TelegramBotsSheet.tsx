import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../hooks/useTheme";
import { navigationRef } from "../../navigation/navigationRef";
import { VideoLessonButton } from "../../modules/video-lessons/components/VideoLessonEntry";
import { useTranslation } from "../../i18n";
import {
  useAppLinks,
  useLinkOpener,
} from "../../modules/support/hooks/useAppLinks";
import {
  getAppLinkDescription,
  getAppLinkIcon,
  getAppLinkTitle,
} from "../../modules/support/utils/appLinkPresentation";
import { LinkQrView } from "../../modules/support/components/LinkQrView";
import { getTelegramBotLinks } from "../../modules/support/utils/appLinks";
import { radius, spacing, typography } from "../../theme";
import { AppTheme } from "../../types";
import type { SheetRenderProps } from "../types";
import { useBottomSheetBackHandler } from "../useBottomSheetBackHandler";

/** The bot whose QR code is on screen. */
interface QrTarget {
  title: string;
  description: string;
  url: string;
}

/**
 * The app has two Telegram bots, and they are for different people: one sends
 * the shop owner a daily report, the other is what a customer talks to to get
 * messages about their debt. The profile has one "Telegram bot" row; this is
 * where it says which is which.
 *
 * Both addresses come from the server's link list.
 */
export function TelegramBotsSheet({
  closeSheet,
}: SheetRenderProps<"telegramBots">) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const links = useAppLinks();
  const { openingKey, open } = useLinkOpener();

  const bots = useMemo(
    () =>
      getTelegramBotLinks(links).map((link) => ({
        link,
        icon: getAppLinkIcon(link.key),
        title: getAppLinkTitle(link, t),
        description: getAppLinkDescription(link, t),
        asQr: SHOWN_AS_QR.includes(link.key),
      })),
    [links, t],
  );

  const busy = openingKey !== null;

  // The code is a second step of this sheet, not another sheet. Opening a
  // sheet for it would have meant closing this one first, and closing the code
  // would then have left the user back on the profile with the list gone.
  const [qrTarget, setQrTarget] = useState<QrTarget | null>(null);
  const hideQr = useCallback(() => setQrTarget(null), []);
  // Android's back button leaves the code for the list, like the arrow does;
  // on the list it closes the sheet, as for any sheet.
  useBottomSheetBackHandler(qrTarget !== null, hideQr);

  return (
    <BottomSheetView
      // Android reserves the strip along the bottom for its navigation bar or
      // gesture handle; without the inset the last row sits underneath it. The
      // extra space on top of that lifts the rows off the screen's edge, where
      // they are easier to reach and do not look cut off.
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 12) + spacing.lg },
      ]}
    >
      {qrTarget ? (
        <LinkQrView
          title={qrTarget.title}
          description={qrTarget.description}
          url={qrTarget.url}
          onBack={hideQr}
        />
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.iconWrap}>
                <Ionicons name="paper-plane-outline" size={22} color={theme.primary} />
              </View>
              <View style={styles.titleCopy}>
                <Text style={styles.title}>{t("support.botsSheetTitle")}</Text>
                <Text style={styles.subtitle}>{t("support.botsSheetSubtitle")}</Text>
              </View>
            </View>
            <View style={styles.headerActions}>
              <VideoLessonButton code="telegram_bot" onPress={() => {
                closeSheet();
                if (navigationRef.isReady()) navigationRef.navigate("VideoLessons", { lessonId: "telegram_bot" });
              }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
              onPress={() => closeSheet()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={21} color={theme.textSecondary} />
            </Pressable>
            </View>
          </View>

          <View style={styles.options}>
            {bots.map((bot) => {
              const loading = openingKey === bot.link.key;
              return (
                <Pressable
                  key={bot.link.key}
                  accessibilityRole={bot.asQr ? "button" : "link"}
                  accessibilityLabel={bot.title}
                  accessibilityHint={bot.description || undefined}
                  accessibilityState={{ disabled: busy, busy: loading }}
                  disabled={busy}
                  onPress={() =>
                    bot.asQr
                      ? setQrTarget({
                          title: bot.title,
                          description: bot.description,
                          url: bot.link.url,
                        })
                      : void open(bot.link)
                  }
                  style={({ pressed }) => [
                    styles.option,
                    pressed && styles.pressed,
                    busy && !loading && styles.dimmed,
                  ]}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name={bot.icon} size={20} color={theme.primary} />
                  </View>
                  <View style={styles.optionCopy}>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {bot.title}
                    </Text>
                    {bot.description ? (
                      <Text style={styles.optionDescription} numberOfLines={2}>
                        {bot.description}
                      </Text>
                    ) : null}
                  </View>
                  {loading ? (
                    <ActivityIndicator size="small" color={theme.primary} />
                  ) : (
                    // One leaves the app for Telegram; the other shows a code.
                    <Ionicons
                      name={bot.asQr ? "qr-code-outline" : "open-outline"}
                      size={18}
                      color={theme.textMuted}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </BottomSheetView>
  );
}

// The customers' bot is not for the person holding this phone. Its row shows a
// QR code for a customer to scan, instead of opening the bot here.
const SHOWN_AS_QR: readonly string[] = ["client_bot"];

// The same frame as the legal documents sheet, so the two read as siblings.
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      gap: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    titleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    iconWrap: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: theme.primaryLight,
    },
    titleCopy: { flex: 1, gap: 2 },
    title: { ...typography.headingMedium, color: theme.text },
    subtitle: { ...typography.caption, color: theme.textSecondary },
    closeButton: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    options: { gap: spacing.xs },
    option: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    optionIcon: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primaryLight,
    },
    optionCopy: { flex: 1, gap: 2 },
    optionTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "700",
    },
    optionDescription: { ...typography.caption, color: theme.textSecondary },
    pressed: { opacity: 0.72 },
    dimmed: { opacity: 0.5 },
  });
