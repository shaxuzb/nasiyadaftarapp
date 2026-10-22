import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import { SubscriptionUpgradeModal } from "../modules/subscription/components/SubscriptionUpgradeModal";
import { AutoReminderCard } from "../modules/client-sms/components/AutoReminderCard";
import { SmsGatewayControls } from "../modules/client-sms/components/SmsGatewayControls";
import {
  useSmsDevices,
  useSmsProvider,
  useUpdateSmsProvider,
} from "../modules/client-sms/hooks/useSmsDevices";
import { QrCode } from "../modules/support/components/QrCode";
import { radius, spacing, typography } from "../theme";
import type { AppTheme } from "../types";
import type { SmsProviderCode } from "../modules/client-sms/types/provider";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Choosing a source and pairing the phone are different backend actions.
 * A single tap selects an already-available source. For an unlinked phone,
 * the same tap opens pairing; successful pairing then saves own_device.
 */
export function SmsSettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const provider = useSmsProvider();
  const updateProvider = useUpdateSmsProvider();
  const devices = useSmsDevices();
  const quota = user?.subscription?.sms;

  const [pairingOpen, setPairingOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const connectedDevice = devices.data?.[0];
  const hasDevice = Boolean(connectedDevice);
  const source = provider.data?.provider;
  const busy = updateProvider.isPending;
  const sourceReady = Boolean(provider.data);

  const downloadGateway = useCallback(async () => {
    try {
      await Linking.openURL(GATEWAY_APK_URL);
    } catch {
      showToast(t("smsSettings.downloadError"), "error");
    }
  }, [showToast, t]);

  const selectSource = useCallback(async (next: SmsProviderCode, justLinked = false) => {
    if (!provider.data || updateProvider.isPending) return;
    if (next === "own_device") {
      if (!provider.data.ownDeviceAllowed) {
        showToast(t("smsSettings.ownDeviceRestricted"), "info");
        return;
      }
      if (!hasDevice && !justLinked) {
        setPairingOpen(true);
        return;
      }
    }
    if (provider.data.provider === next) {
      setPairingOpen(false);
      return;
    }
    try {
      await updateProvider.mutateAsync(next);
      setPairingOpen(false);
      if (!justLinked) showToast(t("smsSettings.providerSaved"), "success");
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "smsSettings.providerSaveError", t), "error");
    }
  }, [provider.data, updateProvider, hasDevice, showToast, t]);

  const onPhoneConnected = useCallback(async () => {
    // The tap on "O'z telefonim" already expressed the intent to use it.
    await selectSource("own_device", true);
  }, [selectSource]);

  const providerError = provider.isError || devices.isError;
  const showPairing = !hasDevice && pairingOpen;
  const showManagement = hasDevice && manageOpen;

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
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t("smsSettings.sourceHeading")}</Text>
          <Text style={styles.sectionDescription}>{t("smsSettings.sourceHint")}</Text>
        </View>

        {providerError ? (
          <Pressable accessibilityRole="button" style={[styles.errorRow, { backgroundColor: theme.inputBackground }]}
            onPress={() => { void provider.refetch(); void devices.refetch(); }}>
            <Ionicons name="alert-circle-outline" size={17} color={theme.dangerColor} />
            <Text style={[styles.errorText, { color: theme.dangerColor }]}>
              {t("smsSettings.sourceLoadError")}
            </Text>
            <Text style={[styles.retryText, { color: theme.primary }]}>
              {t("smsSettings.autoReminderRetry")}
            </Text>
          </Pressable>
        ) : null}

        <View style={[styles.card, source === "system" && styles.selectedCard]}>
          <SourceRow icon="chatbubble-ellipses-outline" title={t("smsSettings.platformTitle")}
            description={t("smsSettings.platformDescription")} selected={source === "system"}
            disabled={!sourceReady || busy || providerError} busy={busy && source !== "system"}
            onPress={() => void selectSource("system")} theme={theme} styles={styles} />
          {source === "system" ? (
            <View style={styles.details}>
              <View style={styles.inlineQuota}>
                <Text numberOfLines={1} style={styles.quotaText}>
                  {t("smsSettings.platformQuotaTitle")}:{" "}
                  {!quota ? "—" : quota.totalRemaining === null
                    ? t("sms.quotaUnlimited")
                    : t("smsSettings.platformQuotaValue", { count: quota.totalRemaining })}
                </Text>
                {quota?.totalRemaining !== null && quota ? (
                  <Pressable accessibilityRole="button" onPress={() => setBuyOpen(true)}
                    hitSlop={8} style={styles.inlineAction}>
                    <Text style={styles.inlineLink}>{t("sms.buyPackage")}</Text>
                    <Ionicons name="chevron-forward" size={13} color={theme.primary} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>

        <View style={[styles.card, source === "own_device" && styles.selectedCard]}>
          <SourceRow icon="phone-portrait-outline" title={t("smsSettings.deviceTitle")}
            description={hasDevice ? t("smsSettings.deviceDescription") :
              t("smsSettings.deviceNotConnected")}
            selected={source === "own_device"} disabled={!sourceReady || busy || providerError}
            busy={busy && source !== "own_device"}
            onPress={() => void selectSource("own_device")} theme={theme} styles={styles} />

          {hasDevice ? (
            <View style={styles.phoneStatus}>
              <View style={styles.phoneStatusCopy}>
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.successColor} />
                <Text numberOfLines={1} style={styles.phoneName}>
                  {connectedDevice?.name || connectedDevice?.deviceCode}
                </Text>
                <Text style={[styles.phoneOnline, {
                  color: connectedDevice?.online === false ? theme.warningColor : theme.textSecondary,
                }]}>
                  {connectedDevice?.online === null ? t("smsSettings.deviceUnknown") :
                    connectedDevice?.online ? t("smsSettings.deviceOnline") :
                    t("smsSettings.deviceOffline")}
                </Text>
              </View>
              <Pressable accessibilityRole="button"
                accessibilityState={{ expanded: manageOpen }}
                onPress={() => setManageOpen(value => !value)} style={styles.inlineAction}>
                <Text style={styles.inlineLink}>{t("smsSettings.managePhone")}</Text>
                <Ionicons name={manageOpen ? "chevron-up" : "chevron-down"}
                  size={14} color={theme.primary} />
              </Pressable>
            </View>
          ) : null}

          {source === "own_device" && connectedDevice?.online === false ? (
            <Text style={[styles.helperText, { color: theme.warningColor }]}>
              {t("smsSettings.offlineQueues")}
            </Text>
          ) : null}

          {showPairing && provider.data?.ownDeviceAllowed ? (
            <View style={styles.details}>
              <Text style={styles.connectHint}>{t("smsSettings.connectForSending")}</Text>
              <SmsGatewayControls onConnected={onPhoneConnected} />
              <Pressable accessibilityRole="button"
                accessibilityState={{ expanded: guideOpen }} onPress={() => setGuideOpen(value => !value)}
                style={styles.helpRow}>
                <Text style={styles.inlineLink}>{t("smsSettings.howToConnect")}</Text>
                <Ionicons name={guideOpen ? "chevron-up" : "chevron-down"}
                  size={14} color={theme.primary} />
              </Pressable>
              {guideOpen ? (
                <View style={styles.helpContent}>
                  <Text style={styles.helperText}>{t("smsSettings.step1Text")}</Text>
                  <Text style={styles.helperText}>{t("smsSettings.step2Text")}</Text>
                  {Platform.OS === "android" ? (
                    <Pressable accessibilityRole="button" style={styles.inlineAction}
                      onPress={downloadGateway}>
                      <Ionicons name="download-outline" size={15} color={theme.primary} />
                      <Text style={styles.inlineLink}>{t("smsSettings.downloadGateway")}</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.gatewayQr}>
                      <View style={styles.gatewayQrCard}>
                        <QrCode value={GATEWAY_APK_URL} size={104}
                          accessibilityLabel={t("smsSettings.gatewayQrA11y")} />
                      </View>
                      <Text selectable style={styles.helperText}>
                        {t("smsSettings.scanOnAndroid")} {GATEWAY_APK_SHORT_URL}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.helperText}>{t("smsSettings.step3Text")}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {showManagement ? (
            <View style={styles.details}>
              <SmsGatewayControls />
            </View>
          ) : null}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>{t("smsSettings.extraHeading")}</Text>
        </View>
        <AutoReminderCard />
      </ScrollView>
      <SubscriptionUpgradeModal visible={buyOpen} reason="sms-packages"
        subscription={user?.subscription} onClose={() => setBuyOpen(false)} />
    </SafeAreaView>
  );
}

function SourceRow({ icon, title, description, selected, disabled, busy, onPress, theme, styles }: {
  icon: IoniconName;
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  busy: boolean;
  onPress: () => void;
  theme: AppTheme;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={title}
      accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.sourceRow, pressed && styles.pressed]}>
      <View style={styles.radio}>
        {selected ? <View style={styles.radioInside} /> : null}
      </View>
      <Ionicons name={icon} size={21} color={selected ? theme.primary : theme.textSecondary} />
      <View style={styles.sourceCopy}>
        <Text style={styles.sourceTitle}>{title}</Text>
        <Text numberOfLines={2} style={styles.sourceSubtitle}>{description}</Text>
      </View>
      {busy ? <ActivityIndicator color={theme.primary} size="small" /> : null}
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: { minHeight: 60, flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.sm },
    headerButton: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
    title: { flex: 1, ...typography.headingLarge, color: theme.text, textAlign: "center" },
    content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    sectionHeading: { gap: 3, marginTop: spacing.md, marginBottom: 4 },
    sectionTitle: { ...typography.bodyMedium, fontWeight: "800", color: theme.text },
    sectionDescription: { ...typography.bodySmall, color: theme.textSecondary, lineHeight: 18 },
    card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
      borderColor: theme.tabBarBorder, backgroundColor: theme.surface, gap: spacing.sm },
    selectedCard: { borderColor: theme.primary },
    sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
    radio: { width: 20, height: 20, borderWidth: 2, borderRadius: 10, borderColor: theme.primary,
      justifyContent: "center", alignItems: "center" },
    radioInside: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary },
    sourceCopy: { flex: 1, minWidth: 0, gap: 3 },
    sourceTitle: { ...typography.bodyMedium, color: theme.text, fontWeight: "700" },
    sourceSubtitle: { ...typography.caption, color: theme.textSecondary, lineHeight: 16 },
    phoneStatus: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 9,
      flexDirection: "row", alignItems: "center", gap: 8 },
    phoneStatusCopy: { flex: 1, flexDirection: "row", alignItems: "center", gap: 5, minWidth: 0 },
    phoneName: { ...typography.caption, color: theme.text, flexShrink: 1, fontWeight: "600" },
    phoneOnline: { ...typography.caption, fontSize: 11 },
    details: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: spacing.sm, gap: spacing.sm },
    inlineQuota: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "space-between" },
    quotaText: { ...typography.caption, fontWeight: "700", color: theme.text, flexShrink: 1 },
    inlineAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, minHeight: 36 },
    inlineLink: { ...typography.caption, color: theme.primary, fontWeight: "700" },
    connectHint: { ...typography.caption, color: theme.textSecondary, lineHeight: 18 },
    helpRow: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 38, alignSelf: "flex-start" },
    helpContent: { gap: spacing.sm },
    helperText: { ...typography.caption, color: theme.textMuted, lineHeight: 18 },
    gatewayQr: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    gatewayQrCard: { padding: 4, backgroundColor: "#FFFFFF", borderRadius: radius.sm },
    errorRow: { flexDirection: "row", alignItems: "center", padding: spacing.sm, gap: spacing.sm,
      borderRadius: radius.md },
    errorText: { ...typography.caption, flex: 1 },
    retryText: { ...typography.caption, fontWeight: "700" },
    pressed: { opacity: 0.7 },
  });
