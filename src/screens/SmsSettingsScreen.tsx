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
import { useSmsDevices, useSmsProvider, useUpdateSmsProvider } from "../modules/client-sms/hooks/useSmsDevices";
import { getLocalizedApiErrorMessage } from "../i18n";
import { QrCode } from "../modules/support/components/QrCode";
import { radius, spacing, typography } from "../theme";
import type { AppTheme } from "../types";

type SourceCard = "platform" | "device";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const INSTALL_STEPS = [
  { title: "smsSettings.step1Title", text: "smsSettings.step1Text" },
  { title: "smsSettings.step2Title", text: "smsSettings.step2Text" },
  { title: "smsSettings.step3Title", text: "smsSettings.step3Text" },
] as const;

/**
 * Provider selection persists through GET/PUT /sms/provider.
 * Pairing and sending remain independent actions.
 */
export function SmsSettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const devices = useSmsDevices();
  const provider = useSmsProvider();
  const updateProvider = useUpdateSmsProvider();
  const smsQuota = user?.subscription?.sms;
  const [expanded, setExpanded] = useState<SourceCard | null>("platform");
  const [guideOpen, setGuideOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const toggleCard = useCallback((card: SourceCard) => {
    setExpanded((previous) => previous === card ? null : card);
  }, []);
  const downloadGateway = useCallback(async () => {
    try { await Linking.openURL(GATEWAY_APK_URL); }
    catch { showToast(t("smsSettings.downloadError"), "error"); }
  }, [showToast, t]);

  const sourceKnown = !!provider.data && !provider.isError;
  const usesOwnPhone = provider.data?.provider === "own_device";
  const chooseSource = async (next: "system" | "own_device") => {
    if (!provider.data || provider.data.provider === next || updateProvider.isPending) return;
    if (next === "own_device" && (!provider.data.ownDeviceAllowed || !devices.data?.length)) {
      setExpanded("device");
      showToast(t(!provider.data.ownDeviceAllowed ? "smsSettings.ownDeviceRestricted" : "smsSettings.connectBeforeSelecting"), "info");
      return;
    }
    try { await updateProvider.mutateAsync(next); showToast(t("smsSettings.providerSaved"), "success"); }
    catch (error) { showToast(getLocalizedApiErrorMessage(error, "smsSettings.providerSaveError", t), "error"); }
  };
  const hasDevices = !!devices.data?.length;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{t("smsSettings.title")}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t("smsSettings.sourceHeading")}</Text>
          <Text style={styles.sectionDescription}>{t("smsSettings.sourceHint")}</Text>
        </View>

        <View style={[styles.card, sourceKnown && !usesOwnPhone && styles.selectedCard]}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === "platform" }}
            accessibilityLabel={t("smsSettings.platformTitle")} onPress={() => toggleCard("platform")}
            style={({ pressed }) => [styles.cardTop, pressed && styles.pressed]}>
            <CardIcon name="chatbubble-ellipses-outline" color={theme.primary}
              background={theme.primaryLight} styles={styles} />
            <View style={styles.cardCopy}>
              <View style={styles.titleLine}>
                <Text style={styles.cardTitle}>{t("smsSettings.platformTitle")}</Text>
                {sourceKnown && !usesOwnPhone ? (
                  <View style={styles.selectedLabel}>
                    <Ionicons name="checkmark-circle" size={12} color={theme.successColor} />
                    <Text style={styles.selectedLabelText}>{t("smsSettings.currentSource")}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.cardText}>{t("smsSettings.platformDescription")}</Text>
            </View>
            <Ionicons name={expanded === "platform" ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
          </Pressable>
          {expanded === "platform" ? (
            <View style={styles.cardDetails}>
              <View style={styles.quotaRow}>
                <View style={styles.quotaText}>
                  <Text style={styles.quotaTitle}>{t("smsSettings.platformQuotaTitle")}</Text>
                  <Text style={styles.quotaNumber}>
                    {!smsQuota ? "—" :
                      smsQuota.totalRemaining === null
                        ? t("sms.quotaUnlimited")
                        : t("smsSettings.platformQuotaValue", { count: smsQuota.totalRemaining })}
                  </Text>
                </View>
                {smsQuota && smsQuota.totalRemaining !== null ? (
                  <Pressable accessibilityRole="button" onPress={() => setBuyOpen(true)}
                    style={({ pressed }) => [styles.buyButton, pressed && styles.pressed]}>
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.buyText}>{t("sms.buyPackage")}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={styles.helperText}>{t("smsSettings.platformQuotaHint")}</Text>
              {sourceKnown && usesOwnPhone ? <Pressable accessibilityRole="button" disabled={updateProvider.isPending}
                onPress={() => void chooseSource("system")} style={[styles.chooseButton, {backgroundColor:theme.primary}]}>
                <Text style={styles.chooseText}>{t("smsSettings.selectPlatform")}</Text>
              </Pressable> : null}
            </View>
          ) : null}
        </View>

        <View style={[styles.card, sourceKnown && usesOwnPhone && styles.selectedCard]}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: expanded === "device" }}
            accessibilityLabel={t("smsSettings.deviceTitle")} onPress={() => toggleCard("device")}
            style={({ pressed }) => [styles.cardTop, pressed && styles.pressed]}>
            <CardIcon name="phone-portrait-outline" color={theme.primary}
              background={theme.primaryLight} styles={styles} />
            <View style={styles.cardCopy}>
              <View style={styles.titleLine}>
                <Text style={styles.cardTitle}>{t("smsSettings.deviceTitle")}</Text>
                {sourceKnown && usesOwnPhone ? (
                  <View style={styles.selectedLabel}>
                    <Ionicons name="checkmark-circle" size={12} color={theme.successColor} />
                    <Text style={styles.selectedLabelText}>{t("smsSettings.currentSource")}</Text>
                  </View>
                ) : !devices.isPending && !devices.isError && hasDevices ? (
                  <Text style={styles.connectedLabel}>{t("smsSettings.deviceConnectedStatus")}</Text>
                ) : null}
              </View>
              <Text style={styles.cardText}>{t("smsSettings.deviceDescription")}</Text>
            </View>
            <Ionicons name={expanded === "device" ? "chevron-up" : "chevron-down"} size={20} color={theme.textMuted} />
          </Pressable>
          {expanded === "device" ? (
            <View style={styles.cardDetails}>
              {!hasDevices ? (
                <View style={styles.connectGuide}>
                  <Text style={styles.guideTitle}>{t("smsSettings.howToConnect")}</Text>
                  {INSTALL_STEPS.map((step, index) => (
                    <View key={step.title} style={styles.step}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.stepCopy}>
                        <Text style={styles.stepTitle}>{t(step.title)}</Text>
                        <Text style={styles.cardText}>{t(step.text)}</Text>
                        {index === 0 && (Platform.OS === "android" ? (
                          <Pressable accessibilityRole="button" onPress={downloadGateway}
                            style={({ pressed }) => [styles.downloadButton, pressed && styles.pressed]}>
                            <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.downloadText}>{t("smsSettings.downloadGateway")}</Text>
                          </Pressable>
                        ) : (
                          <View style={styles.gatewayQr}>
                            <View style={styles.gatewayQrCard}>
                              <QrCode value={GATEWAY_APK_URL} size={126}
                                accessibilityLabel={t("smsSettings.gatewayQrA11y")} />
                            </View>
                            <View style={styles.gatewayQrCopy}>
                              <Text style={styles.cardText}>{t("smsSettings.scanOnAndroid")}</Text>
                              <Text style={styles.linkText} selectable>{GATEWAY_APK_SHORT_URL}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityState={{ expanded: guideOpen }}
                  onPress={() => setGuideOpen(value => !value)} style={styles.guideToggle}>
                  <Text style={styles.linkText}>{t("smsSettings.howToConnect")}</Text>
                  <Ionicons name={guideOpen ? "chevron-up" : "chevron-down"} size={16} color={theme.primary} />
                </Pressable>
              )}
              {hasDevices && guideOpen ? (
                <Text style={styles.helperText}>{t("smsSettings.step3Text")}</Text>
              ) : null}
              <SmsGatewayControls />
              {sourceKnown && !usesOwnPhone ? <Pressable accessibilityRole="button"
                disabled={updateProvider.isPending || devices.isPending || !provider.data?.ownDeviceAllowed || !hasDevices}
                onPress={() => void chooseSource("own_device")}
                style={[styles.chooseButton, { backgroundColor: theme.primary, opacity: updateProvider.isPending || !provider.data?.ownDeviceAllowed || !hasDevices ? 0.45 : 1 }]}>
                <Text style={styles.chooseText}>{t("smsSettings.selectOwnPhone")}</Text>
              </Pressable> : null}
              {sourceKnown && usesOwnPhone && devices.data?.[0]?.online === false ? (
                <Text style={[styles.helperText, { color: theme.warningColor }]}>{t("smsSettings.offlineQueues")}</Text>
              ) : null}
              <Text style={styles.helperText}>{t("smsSettings.androidOnly")}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t("smsSettings.extraHeading")}</Text>
          <Text style={styles.sectionDescription}>{t("smsSettings.extraDescription")}</Text>
        </View>
        <AutoReminderCard />
      </ScrollView>
      <SubscriptionUpgradeModal visible={buyOpen} reason="sms-packages"
        subscription={user?.subscription} onClose={() => setBuyOpen(false)} />
    </SafeAreaView>
  );
}

function CardIcon({ name, color, background, styles }: {
  name: IconName; color: string; background: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.cardIcon, { backgroundColor: background }]}>
      <Ionicons name={name} size={21} color={color} />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { minHeight: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm },
    headerButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    title: { flex: 1, ...typography.headingLarge, color: theme.text, textAlign: "center" },
    content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    sectionHeading: { gap: 3, marginTop: spacing.md, marginBottom: spacing.xs },
    sectionTitle: { ...typography.bodyMedium, fontWeight: "800", color: theme.text },
    sectionDescription: { ...typography.bodySmall, color: theme.textSecondary, lineHeight: 19 },
    card: { gap: 0, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
      borderColor: theme.tabBarBorder, backgroundColor: theme.surface },
    selectedCard: { borderColor: theme.primary },
    cardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 54 },
    cardCopy: { flex: 1, minWidth: 0, gap: 4 },
    cardIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 13 },
    titleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
    cardTitle: { ...typography.bodyMedium, color: theme.text, fontWeight: "800" },
    cardText: { ...typography.caption, lineHeight: 18, color: theme.textSecondary },
    selectedLabel: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7,
      paddingVertical: 3, borderRadius: radius.full, backgroundColor: theme.paymentBg },
    selectedLabelText: { color: theme.successColor, fontSize: 10, fontWeight: "700" },
    connectedLabel: { fontSize: 11, fontWeight: "700", color: theme.textSecondary },
    cardDetails: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
    quotaRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center",
      backgroundColor: theme.primaryLight, borderRadius: radius.md, padding: spacing.sm },
    quotaText: { flex: 1, gap: 4, minWidth: 0 },
    quotaTitle: { ...typography.caption, color: theme.textSecondary },
    quotaNumber: { ...typography.bodyMedium, fontWeight: "800", color: theme.text },
    buyButton: { minHeight: 38, borderRadius: radius.full, paddingHorizontal: 12, gap: 4,
      flexDirection: "row", justifyContent: "center", alignItems: "center", backgroundColor: theme.primary },
    buyText: { ...typography.labelSmall, color: "#FFFFFF", fontWeight: "700" },
    helperText: { ...typography.caption, lineHeight: 17, color: theme.textMuted },
    connectGuide: { gap: spacing.sm },
    guideTitle: { ...typography.label, fontWeight: "800", color: theme.text },
    step: { flexDirection: "row", gap: spacing.sm },
    stepNumber: { width: 26, height: 26, backgroundColor: theme.primaryLight,
      borderRadius: 13, alignItems: "center", justifyContent: "center" },
    stepNumberText: { ...typography.caption, fontWeight: "800", color: theme.primary },
    stepCopy: { flex: 1, gap: 3 },
    stepTitle: { ...typography.bodySmall, fontWeight: "700", color: theme.text },
    downloadButton: { alignSelf: "flex-start", minHeight: 38, paddingHorizontal: 14, gap: 6,
      flexDirection: "row", alignItems: "center", borderRadius: radius.full,
      marginTop: spacing.xs, backgroundColor: theme.primary },
    downloadText: { ...typography.labelSmall, color: "#FFFFFF", fontWeight: "800" },
    gatewayQr: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
    gatewayQrCard: { padding: 3, borderRadius: radius.md, backgroundColor: "#FFFFFF" },
    gatewayQrCopy: { flex: 1, gap: 5 },
    linkText: { ...typography.caption, fontWeight: "700", color: theme.primary },
    guideToggle: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 36 },
    chooseButton: { minHeight: 44, borderRadius: radius.md, justifyContent: "center", alignItems: "center", marginTop: spacing.xs },
    chooseText: { color: "#FFFFFF", fontWeight: "700" },
    pressed: { opacity: 0.7 },
  });
