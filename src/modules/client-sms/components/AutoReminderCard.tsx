import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import { useToast } from "../../../context/ToastContext";
import { useTranslation } from "../../../i18n";
import { useAutoReminderSettings, useUpdateAutoReminderSettings } from "../hooks/useClientSms";

/** No second settings screen: this card belongs to the existing SMS settings flow. */
export function AutoReminderCard() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const query = useAutoReminderSettings();
  const update = useUpdateAutoReminderSettings();
  const settings = query.data;
  const [enabled, setEnabled] = useState(false);
  const [days, setDays] = useState("");
  const [balance, setBalance] = useState("");

  useEffect(() => {
    if (!settings) return;
    setEnabled(settings.enabled);
    setDays(String(settings.intervalDays));
    setBalance(String(settings.minBalance));
  }, [settings]);

  const numericDays = Number(days.trim());
  const numericBalance = Number(balance.trim());
  const valid = Boolean(days.trim()) && Boolean(balance.trim()) &&
    Number.isSafeInteger(numericDays) &&
    numericDays >= (settings?.minIntervalDays ?? 1) &&
    Number.isFinite(numericBalance) && numericBalance >= 0;
  const changed = Boolean(settings) && (
    enabled !== settings!.enabled || numericDays !== settings!.intervalDays || numericBalance !== settings!.minBalance
  );
  const busy = query.isPending || update.isPending;

  const save = async () => {
    if (!settings?.available || !valid || update.isPending) {
      showToast(t("smsSettings.autoReminderValidation"), "error");
      return;
    }
    try {
      await update.mutateAsync({ enabled, intervalDays: numericDays, minBalance: numericBalance });
      showToast(t("smsSettings.autoReminderSaved"), "success");
    } catch {
      showToast(t("smsSettings.autoReminderSaveError"), "error");
    }
  };

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
      <View style={styles.heading}>
        <View style={[styles.icon, { backgroundColor: theme.primaryLight }]}>
          <Ionicons name="notifications-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: theme.text }]}>{t("smsSettings.autoReminderTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t("smsSettings.autoReminderInfo")}</Text>
        </View>
        {settings?.available ? (
          <Switch accessibilityLabel={t("smsSettings.autoReminderEnabled")} disabled={busy}
            value={enabled} onValueChange={setEnabled} trackColor={{ true: theme.primary }} />
        ) : null}
      </View>
      {query.isPending ? <ActivityIndicator color={theme.primary} /> :
        query.isError ? (
          <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.retry}>
            <Text style={{ color: theme.dangerColor }}>{t("smsSettings.autoReminderLoadError")}</Text>
            <Text style={{ color: theme.primary }}>{t("smsSettings.autoReminderRetry")}</Text>
          </Pressable>
        ) : settings && !settings.available ? (
          <Text style={[styles.locked, { color: theme.textSecondary, backgroundColor: theme.inputBackground }]}>
            {t("smsSettings.autoReminderLocked")}
          </Text>
        ) : settings ? (
          <View style={styles.form}>
            <Text style={[styles.summary, { color: theme.text }]}>
              {t("smsSettings.autoReminderSummary", { count: valid ? numericDays : settings.intervalDays })}
            </Text>
            <View style={styles.inputs}>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t("smsSettings.autoReminderInterval")}</Text>
                <TextInput value={days} onChangeText={setDays} editable={!update.isPending}
                  keyboardType="number-pad" maxLength={3} accessibilityLabel={t("smsSettings.autoReminderInterval")}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]} />
                <Text style={[styles.hint, { color: theme.textMuted }]}>
                  {t("smsSettings.autoReminderMin", { count: settings.minIntervalDays })}
                </Text>
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>{t("smsSettings.autoReminderBalance")}</Text>
                <TextInput value={balance} onChangeText={setBalance} editable={!update.isPending}
                  keyboardType="numeric" maxLength={14} accessibilityLabel={t("smsSettings.autoReminderBalance")}
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]} />
              </View>
            </View>
            <Pressable accessibilityRole="button" disabled={!valid || !changed || update.isPending}
              onPress={() => void save()} style={[styles.button, { backgroundColor: theme.primary, opacity: valid && changed && !update.isPending ? 1 : 0.45 }]}>
              {update.isPending ? <ActivityIndicator color="#FFFFFF" size="small" /> :
                <Text style={styles.buttonText}>{t("smsSettings.autoReminderSave")}</Text>}
            </Pressable>
          </View>
        ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  heading: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headingCopy: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: "800" },
  subtitle: { fontSize: 12, lineHeight: 18 },
  form: { gap: 12 },
  summary: { fontSize: 13, fontWeight: "600" },
  inputs: { flexDirection: "row", gap: 12 },
  field: { flex: 1, gap: 5, minWidth: 0 },
  label: { fontSize: 12, fontWeight: "600" },
  input: { minHeight: 44, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  hint: { fontSize: 11 },
  button: { minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  locked: { padding: 12, borderRadius: 10, fontSize: 13 },
  retry: { gap: 8, paddingVertical: 8 },
});
