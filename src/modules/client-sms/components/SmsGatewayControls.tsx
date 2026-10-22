import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import { useToast } from "../../../context/ToastContext";
import { useConfirmDialog } from "../../../context/ConfirmDialogContext";
import { useSmsDevices, useClaimSmsDevice, useDeleteSmsDevice } from "../hooks/useSmsDevices";
import { SmsGatewayQrScanner } from "./SmsGatewayQrScanner";

/** Embedded in "O'z telefonim"; intentionally NOT a separate device card. */
export function SmsGatewayControls() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirmDialog();
  const devices = useSmsDevices();
  const claim = useClaimSmsDevice();
  const remove = useDeleteSmsDevice();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [code, setCode] = useState("");
  const busy = claim.isPending || remove.isPending;

  const scanned = useCallback((value: string) => {
    setCode(value); // QR data is the full input; do not guess an undocumented deep link format.
    setScannerOpen(false);
  }, []);

  const paste = async () => {
    try {
      const value = (await Clipboard.getStringAsync()).trim();
      if (value) { setCode(value); }
      else showToast(t("smsSettings.clipboardEmpty"), "info");
    } catch { showToast(t("smsSettings.clipboardError"), "error"); }
  };

  const connect = async () => {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    try {
      await claim.mutateAsync({ code: trimmed });
      setCode("");
      showToast(t("smsSettings.deviceConnected"), "success");
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "smsSettings.deviceConnectError", t), "error");
    }
  };

  const disconnect = async (deviceCode: string) => {
    if (busy) return;
    const accepted = await confirm({
      title: t("smsSettings.deviceRemoveTitle"),
      message: t("smsSettings.deviceRemoveDescription"),
      confirmText: t("smsSettings.deviceRemove"),
      cancelText: t("common.cancel"),
    });
    if (!accepted) return;
    try {
      await remove.mutateAsync(deviceCode);
      setCode("");
      showToast(t("smsSettings.deviceRemoved"), "success");
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "smsSettings.deviceRemoveError", t), "error");
    }
  };

  return (
    <View style={styles.root}>
      {devices.isPending ? (
        <ActivityIndicator color={theme.primary} />
      ) : devices.isError ? (
        <Pressable accessibilityRole="button" onPress={() => void devices.refetch()} style={styles.retry}>
          <Text style={{ color: theme.dangerColor }}>{t("smsSettings.deviceLoadError")}</Text>
          <Text style={{ color: theme.primary }}>{t("smsSettings.autoReminderRetry")}</Text>
        </Pressable>
      ) : devices.data?.length ? (
        <View style={[styles.devices, { borderColor: theme.border }]}>
          {devices.data.map((device) => (
            <View key={device.deviceCode} style={styles.device}>
              <View style={styles.deviceHeading}>
                <Ionicons name="phone-portrait-outline" size={18} color={theme.primary} />
                <View style={styles.deviceName}>
                  <Text style={[styles.name, { color: theme.text }]}>
                    {device.name || device.deviceCode}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>{device.deviceCode}</Text>
                </View>
                <Text style={[styles.meta, { color: device.online === true ? theme.successColor : theme.textMuted }]}>
                  {device.online === null ? t("smsSettings.deviceUnknown") :
                    device.online ? t("smsSettings.deviceOnline") : t("smsSettings.deviceOffline")}
                </Text>
              </View>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {t("smsSettings.deviceBattery")}: {device.battery === null ? "—" : `${device.battery}%`}
              </Text>
              {device.canSend === false && device.unavailableReason ? <Text style={[styles.meta, { color: theme.warningColor }]}>{device.unavailableReason}</Text> : null}
              {device.sims.map((sim) => (
                <View key={sim.id} style={[styles.simQuota, { backgroundColor: theme.inputBackground }]}>
                  <Text style={[styles.simName, { color: theme.text }]}>
                    {sim.name || `SIM ${sim.slot + 1}`}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    {t("smsSettings.usedNumbersToday", { count: sim.usedToday, limit: sim.dailyLimit })}
                  </Text>
                  <Text style={[styles.remaining, { color: theme.primary }]}>
                    {t("smsSettings.remainingNumbersToday", { count: sim.remainingToday })}
                  </Text>
                  <Text style={[styles.meta, { color: theme.textMuted }]}>
                    {t("smsSettings.phoneDailyLimitHint")}
                  </Text>
                </View>
              ))}
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => void disconnect(device.deviceCode)}
                style={[styles.disconnect, { backgroundColor: theme.dangerColor, opacity: busy ? 0.5 : 1 }]}>
                {remove.isPending ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.disconnectText}>{t("smsSettings.deviceRemove")}</Text>}
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {!devices.isPending && !devices.isError && !devices.data?.length ? (
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t("smsSettings.deviceCodeLabel")}</Text>
          <View style={[styles.inputShell, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
            <TextInput style={[styles.input, { color: theme.text }]}
              value={code} onChangeText={setCode} editable={!busy}
              autoCapitalize="characters" autoCorrect={false}
              placeholder="K7Q2-M9XD" placeholderTextColor={theme.textMuted}
              accessibilityLabel={t("smsSettings.deviceCodeLabel")} selectTextOnFocus />
            <Pressable accessibilityRole="button" accessibilityLabel={t("smsSettings.scanQr")}
              disabled={busy} onPress={() => setScannerOpen(true)} style={styles.scanIcon} hitSlop={5}>
              <Ionicons name="qr-code-outline" size={22} color={theme.primary} />
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" disabled={busy || !code.trim()} onPress={() => void connect()}
            style={[styles.connect, { backgroundColor: theme.primary, opacity: busy || !code.trim() ? 0.45 : 1 }]}>
            {claim.isPending ? <ActivityIndicator color="#FFFFFF" /> :
              <Text style={styles.connectText}>{t("smsSettings.deviceConnect")}</Text>}
          </Pressable>
        </View>
      ) : null}
      {scannerOpen ? (
        <SmsGatewayQrScanner onRead={scanned} onClose={() => setScannerOpen(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  devices: { borderTopWidth: 1, paddingTop: 12, gap: 12 },
  device: { gap: 8 },
  deviceHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  deviceName: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 14, fontWeight: "700" },
  meta: { fontSize: 12 },
  simQuota: { borderRadius: 11, padding: 11, gap: 4 },
  simName: { fontSize: 12, fontWeight: "700" },
  remaining: { fontSize: 13, fontWeight: "800" },
  disconnect: { minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 12, marginTop: 8 },
  disconnectText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  form: { gap: 10, paddingTop: 4 },
  label: { fontSize: 12, fontWeight: "600" },
  inputShell: { minHeight: 48, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12 },
  input: { flex: 1, minWidth: 0, paddingHorizontal: 12, minHeight: 46, fontSize: 14 },
  scanIcon: { width: 48, height: 46, alignItems: "center", justifyContent: "center" },
  connect: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  connectText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  retry: { gap: 6, minHeight: 44, justifyContent: "center" },
});
