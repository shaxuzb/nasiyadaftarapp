import React, { useCallback, useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { GATEWAY_APK_SHORT_URL, GATEWAY_APK_URL } from "../config/gatewayApp";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { useTranslation } from "../i18n";
import { SubscriptionUpgradeModal } from "../modules/subscription/components/SubscriptionUpgradeModal";
import { AutoReminderCard } from "../modules/client-sms/components/AutoReminderCard";
import { SmsGatewayControls } from "../modules/client-sms/components/SmsGatewayControls";
import { useSmsDevices } from "../modules/client-sms/hooks/useSmsDevices";
import { QrCode } from "../modules/support/components/QrCode";
import { radius, spacing, typography } from "../theme";
import type { AppTheme } from "../types";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

// Big enough for a phone camera at arm's length, small enough to sit inside a
// step without pushing the rest of the guide off the screen.
const GATEWAY_QR_SIZE = 132;

// The three steps of connecting a phone, in the order the user does them.
const CONNECT_STEPS = [
  { title: "smsSettings.step1Title", text: "smsSettings.step1Text" },
  { title: "smsSettings.step2Title", text: "smsSettings.step2Text" },
  { title: "smsSettings.step3Title", text: "smsSettings.step3Text" },
] as const;

/**
 * How SMS reach customers.
 *
 *   Qarz Daftar SMS   the app's own provider: nothing to set up. This part is
 *                     live: the real balance, and buying more.
 *   My phone          the shop's Android SMS Gateway, paired via its code
 *                     either scanned as QR or entered manually. Both paths
 *                     confirm the claim through the authenticated API.
 */
export function SmsSettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const smsQuota = user?.subscription?.sms;
  const devices = useSmsDevices();
  const [guideOpen, setGuideOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const toggleGuide = useCallback(() => setGuideOpen((open) => !open), []);
  const openBuy = useCallback(() => setBuyOpen(true), []);
  const closeBuy = useCallback(() => setBuyOpen(false), []);
  // The browser downloads the APK and hands it to the Android installer.
  const downloadGateway = useCallback(async () => {
    try {
      await Linking.openURL(GATEWAY_APK_URL);
    } catch {
      showToast(t("smsSettings.downloadError"), "error");
    }
  }, [showToast, t]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t("smsSettings.title")}
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>{t("smsSettings.intro")}</Text>

        {/* The provider in use today. Live, not part of the demo. */}
        <View style={[styles.card, styles.cardActive]}>
          <View style={styles.cardTop}>
            <CardIcon
              name="chatbubble-ellipses-outline"
              color={theme.primary}
              background={theme.primaryLight}
              styles={styles}
            />
            <View style={styles.cardCopy}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>
                  {t("smsSettings.platformTitle")}
                </Text>
                <View style={[styles.pill, styles.activePill]}>
                  <View style={styles.activeDot} />
                  <Text style={[styles.pillText, styles.activePillText]}>
                    {t("smsSettings.active")}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardText}>
                {t("smsSettings.platformDescription")}
              </Text>
            </View>
          </View>

          {smsQuota ? (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceText}>
                {smsQuota.totalRemaining === null
                  ? t("sms.quotaUnlimited")
                  : t("sms.quotaRemaining", { count: smsQuota.totalRemaining })}
              </Text>
              {/* Unlimited SMS leaves nothing to buy. */}
              {smsQuota.totalRemaining !== null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("subscription.purchasePackage")}
                  hitSlop={8}
                  onPress={openBuy}
                  style={({ pressed }) => [
                    styles.buyButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="add" size={15} color="#FFFFFF" />
                  <Text style={styles.buyText}>{t("sms.buyPackage")}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        <AutoReminderCard />

        {/* The existing own-phone card owns pairing, connected devices and unpairing. */}
        <View style={styles.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("smsSettings.deviceTitle")}
            accessibilityHint={t("smsSettings.guideA11y")}
            accessibilityState={{ expanded: guideOpen }}
            onPress={toggleGuide}
            style={({ pressed }) => [styles.cardTop, pressed && styles.pressed]}
          >
            <CardIcon
              name="phone-portrait-outline"
              color={theme.warningColor}
              background={`${theme.warningColor}14`}
              styles={styles}
            />
            <View style={styles.cardCopy}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>
                  {t("smsSettings.deviceTitle")}
                </Text>
                {!devices.isPending && !devices.isError ? (
                  <View style={[styles.pill, { backgroundColor: (devices.data?.length ? theme.successColor : theme.warningColor) + "16" }]}>
                    <Text style={[styles.pillText, { color: devices.data?.length ? theme.successColor : theme.warningColor }]}>
                      {devices.data?.length ? t("smsSettings.deviceConnectedStatus") : t("smsSettings.deviceNotConnected")}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardText}>
                {t("smsSettings.deviceDescription")}
              </Text>
            </View>
            <Ionicons
              name={guideOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>

          {guideOpen ? (
            <View style={styles.guide}>
              <Text style={styles.guideTitle}>
                {t("smsSettings.howToConnect")}
              </Text>
              {CONNECT_STEPS.map((step, index) => (
                <View key={step.title} style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.stepCopy}>
                    <Text style={styles.stepTitle}>{t(step.title)}</Text>
                    <Text style={styles.stepText}>{t(step.text)}</Text>
                    {index === 0 ? (
                      // An iPhone cannot install an APK, so it gets the link
                      // to open on the Android phone instead of a button.
                      Platform.OS === "android" ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t("smsSettings.downloadGateway")}
                          accessibilityHint={t("smsSettings.downloadA11y")}
                          onPress={downloadGateway}
                          style={({ pressed }) => [
                            styles.downloadButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <Ionicons
                            name="download-outline"
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.downloadText}>
                            {t("smsSettings.downloadGateway")}
                          </Text>
                        </Pressable>
                      ) : (
                        // On an iPhone the download happens on the other phone:
                        // its camera reads the code and opens the page.
                        <View style={styles.gatewayQr}>
                          <View style={styles.gatewayQrCard}>
                            <QrCode
                              value={GATEWAY_APK_URL}
                              size={GATEWAY_QR_SIZE}
                              accessibilityLabel={t("smsSettings.gatewayQrA11y")}
                            />
                          </View>
                          <View style={styles.gatewayQrCopy}>
                            <Text style={styles.stepText}>
                              {t("smsSettings.scanOnAndroid")}
                            </Text>
                            <Text style={styles.linkText} selectable>
                              {GATEWAY_APK_SHORT_URL}
                            </Text>
                          </View>
                        </View>
                      )
                    ) : null}
                    {index === 0 ? (
                      // Not from Google Play, so Android asks before it installs.
                      // Said in advance, that question is expected, not alarming.
                      <View style={styles.installHint}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={15}
                          color={theme.textSecondary}
                        />
                        <Text style={styles.installHintText}>
                          {t("smsSettings.unknownSourcesHint")}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}

              <SmsGatewayControls />
              <Text style={styles.footnote}>{t("smsSettings.androidOnly")}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <SubscriptionUpgradeModal
        visible={buyOpen}
        reason="sms-packages"
        subscription={user?.subscription}
        onClose={closeBuy}
      />
    </SafeAreaView>
  );
}

function CardIcon({
  name,
  color,
  background,
  styles,
}: {
  name: IconName;
  color: string;
  background: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.cardIcon, { backgroundColor: background }]}>
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      ...typography.headingLarge,
      color: theme.text,
      textAlign: "center",
    },
    content: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    intro: {
      ...typography.bodySmall,
      color: theme.textSecondary,
    },
    card: {
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.tabBarBorder,
      backgroundColor: theme.surface,
    },
    cardActive: {
      borderColor: theme.primary,
      backgroundColor: `${theme.primary}05`,
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
    },
    cardIcon: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
    },
    cardCopy: { flex: 1, minWidth: 0, gap: 4 },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: spacing.xs,
    },
    cardTitle: {
      ...typography.bodyMedium,
      color: theme.text,
      fontWeight: "800",
    },
    cardText: {
      ...typography.caption,
      lineHeight: 18,
      color: theme.textSecondary,
    },
    pill: {
      minHeight: 22,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      borderRadius: radius.full,
    },
    pillText: { ...typography.caption, fontWeight: "800" },
    activePill: { backgroundColor: `${theme.successColor}16` },
    activePillText: { color: theme.successColor },
    activeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.successColor,
    },
    balanceRow: {
      minHeight: 44,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    balanceText: {
      flex: 1,
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: "700",
    },
    buyButton: {
      height: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingLeft: 8,
      paddingRight: 12,
      borderRadius: radius.full,
      backgroundColor: theme.primary,
    },
    buyText: {
      ...typography.caption,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    guide: {
      gap: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    guideTitle: {
      ...typography.label,
      color: theme.text,
      fontWeight: "800",
    },
    step: { flexDirection: "row", gap: spacing.sm },
    stepNumber: {
      width: 26,
      height: 26,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      backgroundColor: theme.primaryLight,
    },
    stepNumberText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "800",
    },
    stepCopy: { flex: 1, gap: 2 },
    stepTitle: {
      ...typography.bodySmall,
      color: theme.text,
      fontWeight: "700",
    },
    stepText: {
      ...typography.caption,
      lineHeight: 18,
      color: theme.textSecondary,
    },
    downloadButton: {
      alignSelf: "flex-start",
      minHeight: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: spacing.xs,
      paddingHorizontal: 14,
      borderRadius: radius.full,
      backgroundColor: theme.primary,
    },
    downloadText: {
      ...typography.labelSmall,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    linkText: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "700",
    },
    gatewayQr: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    // The code brings its own white ground; this frames it, so in the dark
    // theme the white square reads as a card and not as a hole.
    gatewayQrCard: {
      padding: 2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "#FFFFFF",
    },
    gatewayQrCopy: { flex: 1, minWidth: 0, gap: 4 },
    installHint: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
      marginTop: spacing.xs,
      padding: spacing.sm,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    installHintText: {
      flex: 1,
      ...typography.caption,
      lineHeight: 17,
      color: theme.textSecondary,
    },
    footnote: {
      ...typography.caption,
      color: theme.textMuted,
    },
    pressed: { opacity: 0.75 },
  });
