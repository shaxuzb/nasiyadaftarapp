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
  const [editorOpen, setEditorOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [code, setCode] = useState("");
  const busy = claim.isPending || remove.isPending;

  const scanned = useCallback((value: string) => {
    setCode(value); // QR data is the full input; do not guess an undocumented deep link format.
    setScannerOpen(false);
    setEditorOpen(true);
  }, []);

  const paste = async () => {
    try {
      const value = (await Clipboard.getStringAsync()).trim();
      if (value) { setCode(value); setEditorOpen(true); }
      else showToast(t("smsSettings.clipboardEmpty"), "info");
    } catch { showToast(t("smsSettings.clipboardError"), "error"); }
  };

  const connect = async () => {
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    try {
      await claim.mutateAsync({ code: trimmed });
      setCode("");
      setEditorOpen(false);
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
                style={[styles.disconnect, { opacity: busy ? 0.5 : 1 }]}>
                <Text style={{ color: theme.dangerColor, fontWeight: "700" }}>{t("smsSettings.deviceRemove")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setScannerOpen(true)}
          style={[styles.action, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
          <Ionicons name="qr-code-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.text }]}>{t("smsSettings.scanQr")}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => setEditorOpen((open) => !open)}
          style={[styles.action, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
          <Ionicons name="clipboard-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.text }]}>{t("smsSettings.enterCode")}</Text>
        </Pressable>
      </View>

      {editorOpen ? (
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t("smsSettings.deviceCodeLabel")}</Text>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
              value={code} onChangeText={setCode} editable={!claim.isPending}
              autoCapitalize="characters" autoCorrect={false}
              placeholder={t("smsSettings.deviceCodeLabel")} placeholderTextColor={theme.textMuted}
              accessibilityLabel={t("smsSettings.deviceCodeLabel")}
              selectTextOnFocus />
            <Pressable accessibilityRole="button" disabled={claim.isPending}
              onPress={() => void paste()} style={[styles.paste, { borderColor: theme.border }]}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>{t("smsSettings.pasteCode")}</Text>
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
  disconnect: { minHeight: 38, justifyContent: "center", alignSelf: "flex-start" },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, minHeight: 48, flexDirection: "row", gap: 6, alignItems: "center",
    justifyContent: "center", paddingHorizontal: 8, borderRadius: 12, borderWidth: 1 },
  actionText: { fontSize: 12, fontWeight: "700", flexShrink: 1 },
  form: { gap: 10, paddingTop: 4 },
  label: { fontSize: 12, fontWeight: "700" },
  inputRow: { flexDirection: "row", gap: 8 },
  input: { minWidth: 0, flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  paste: { minHeight: 46, paddingHorizontal: 12, alignItems: "center",
    justifyContent: "center", borderWidth: 1, borderRadius: 10 },
  connect: { minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  connectText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  retry: { gap: 6, minHeight: 44, justifyContent: "center" },
});
