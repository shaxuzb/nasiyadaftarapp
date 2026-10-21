import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../hooks/useTheme";
import { useTranslation, getLocalizedApiErrorMessage } from "../../../i18n";
import { useToast } from "../../../context/ToastContext";
import { useConfirmDialog } from "../../../context/ConfirmDialogContext";
import { useSmsDevices, useClaimSmsDevice, useDeleteSmsDevice } from "../hooks/useSmsDevices";

export function SmsDevicesCard() {
  const theme = useTheme(); const { t } = useTranslation(); const { showToast } = useToast(); const { confirm } = useConfirmDialog();
  const devices = useSmsDevices(); const claim = useClaimSmsDevice(); const remove = useDeleteSmsDevice();
  const [code, setCode] = useState(""); const [name, setName] = useState("");
  const busy = claim.isPending || remove.isPending;
  const connect = async () => {
    if (!code.trim() || busy) return;
    try { await claim.mutateAsync({ code, ...(name.trim() ? { name } : {}) }); setCode(""); setName(""); showToast(t("smsSettings.deviceConnected"), "success"); }
    catch (error) { showToast(getLocalizedApiErrorMessage(error, "smsSettings.deviceConnectError", t), "error"); }
  };
  const disconnect = async (deviceCode: string) => {
    if (busy) return;
    const accepted = await confirm({ title: t("smsSettings.deviceRemoveTitle"), message: t("smsSettings.deviceRemoveDescription"), confirmText: t("smsSettings.deviceRemove"), cancelText: t("common.cancel") });
    if (!accepted) return;
    try { await remove.mutateAsync(deviceCode); showToast(t("smsSettings.deviceRemoved"), "success"); }
    catch (error) { showToast(getLocalizedApiErrorMessage(error, "smsSettings.deviceRemoveError", t), "error"); }
  };
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
    <View style={styles.header}><Ionicons name="phone-portrait-outline" size={22} color={theme.primary} /><Text style={[styles.title,{color:theme.text}]}>{t("smsSettings.devicesHeading")}</Text></View>
    {devices.isPending ? <ActivityIndicator color={theme.primary} /> : devices.isError ?
      <Pressable onPress={() => void devices.refetch()}><Text style={{ color: theme.dangerColor }}>{t("smsSettings.deviceLoadError")} · {t("smsSettings.autoReminderRetry")}</Text></Pressable> :
      devices.data?.length ? devices.data.map(device => <View key={device.deviceCode} style={[styles.device,{borderColor:theme.border}]}>
        <View style={styles.row}><View style={{flex:1}}><Text style={[styles.name,{color:theme.text}]}>{device.name || device.deviceCode}</Text><Text style={{color:theme.textMuted,fontSize:12}}>{device.deviceCode}</Text></View><Text style={{color:device.online === true ? theme.paymentColor : theme.textMuted,fontSize:12}}>{device.online === null ? t("smsSettings.deviceUnknown") : device.online ? t("smsSettings.deviceOnline") : t("smsSettings.deviceOffline")}</Text></View>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{t("smsSettings.deviceBattery")}: {device.battery === null ? "—" : `${device.battery}%`}</Text>
        {device.lastSeenAt ? <Text style={{color:theme.textMuted,fontSize:11}}>{t("smsSettings.deviceLastSeen")}: {new Date(device.lastSeenAt).toLocaleString()}</Text> : null}
        {device.sims.map(sim => <View key={sim.id} style={styles.row}><Text style={{color:theme.textSecondary,flex:1,fontSize:12}}>{sim.name || `SIM ${sim.slot + 1}`}</Text><Text style={{color:theme.text,fontSize:12}}>{sim.usedToday} / {sim.dailyLimit} · {t("smsSettings.deviceRemaining")}: {sim.remainingToday}</Text></View>)}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => void disconnect(device.deviceCode)} style={styles.remove}><Text style={{color:theme.dangerColor,fontWeight:"700"}}>{t("smsSettings.deviceRemove")}</Text></Pressable>
      </View>) : <Text style={{color:theme.textSecondary,fontSize:13}}>{t("smsSettings.devicesEmpty")}</Text>}
    <View style={styles.form}><Text style={[styles.label,{color:theme.textSecondary}]}>{t("smsSettings.deviceCodeLabel")}</Text>
      <TextInput value={code} onChangeText={setCode} editable={!busy} autoCapitalize="characters" autoCorrect={false} placeholder="K7Q2-M9XD" placeholderTextColor={theme.textMuted} style={[styles.input,{borderColor:theme.border,color:theme.text}]} />
      <Text style={[styles.label,{color:theme.textSecondary}]}>{t("smsSettings.deviceNameLabel")}</Text>
      <TextInput value={name} onChangeText={setName} editable={!busy} placeholder={t("smsSettings.deviceNameOptional")} placeholderTextColor={theme.textMuted} style={[styles.input,{borderColor:theme.border,color:theme.text}]} />
      <Pressable accessibilityRole="button" disabled={busy || !code.trim()} onPress={() => void connect()} style={[styles.connect,{backgroundColor:theme.primary,opacity:busy || !code.trim() ? .45 : 1}]}>
        {claim.isPending ? <ActivityIndicator color="#fff" /> : <Text style={{color:"#fff",fontWeight:"700"}}>{t("smsSettings.deviceConnect")}</Text>}
      </Pressable>
    </View>
  </View>;
}
const styles=StyleSheet.create({
  card:{padding:16,borderRadius:18,borderWidth:1,gap:14},
  header:{flexDirection:"row",alignItems:"center",gap:8},
  title:{fontSize:15,fontWeight:"800"},
  device:{borderTopWidth:1,paddingTop:12,gap:8},
  row:{flexDirection:"row",alignItems:"center",gap:8},
  name:{fontSize:14,fontWeight:"700"},
  remove:{alignSelf:"flex-start",minHeight:38,justifyContent:"center"},
  form:{gap:8},
  label:{fontSize:12,fontWeight:"600"},
  input:{minHeight:44,borderRadius:10,borderWidth:1,paddingHorizontal:12},
  connect:{minHeight:44,borderRadius:12,alignItems:"center",justifyContent:"center"}
});
