import React, { useCallback, useRef } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "../../../i18n";

interface Props {
  onRead: (rawCode: string) => void;
  onClose: () => void;
}

/** Camera exists only while the modal is mounted. QR payload is not parsed as an undocumented URL. */
export function SmsGatewayQrScanner({ onRead, onClose }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const scanned = useRef(false);
  const handleScan = useCallback(({ data }: { data: string }) => {
    if (scanned.current) return;
    const rawCode = data.trim();
    if (!rawCode) return;
    scanned.current = true;
    onRead(rawCode);
  }, [onRead]);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} accessibilityRole="button"
            accessibilityLabel={t("common.close")} hitSlop={10} style={styles.close}>
            <Ionicons name="close" color="#FFFFFF" size={26} />
          </Pressable>
          <Text style={styles.title}>{t("smsSettings.scanQr")}</Text>
          <View style={styles.close} />
        </View>
        {permission?.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView style={StyleSheet.absoluteFill} facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleScan} />
            <View pointerEvents="none" style={styles.overlay}>
              <View style={styles.finder} />
              <Text style={styles.hint}>{t("smsSettings.scanQrHint")}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.permission}>
            <Ionicons name="camera-outline" color="#FFFFFF" size={34} />
            <Text style={styles.hint}>{t("smsSettings.cameraPermissionHint")}</Text>
            {permission?.canAskAgain !== false ? (
              <Pressable style={styles.permissionButton} accessibilityRole="button"
                onPress={() => void requestPermission()}>
                <Text style={styles.permissionButtonText}>{t("smsSettings.cameraPermissionAction")}</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={onClose}>
              <Text style={styles.manualHint}>{t("smsSettings.enterCode")}</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#090E1D" },
  header: { height: 60, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  close: { width: 44, height: 44, justifyContent: "center", alignItems: "center" },
  title: { flex: 1, color: "#FFFFFF", textAlign: "center", fontSize: 17, fontWeight: "700" },
  cameraContainer: { flex: 1, overflow: "hidden" },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  finder: { width: 248, height: 248, borderWidth: 3, borderColor: "#FFFFFF", borderRadius: 22 },
  hint: { textAlign: "center", color: "#FFFFFF", paddingHorizontal: 28, fontSize: 14, lineHeight: 21 },
  permission: { flex: 1, gap: 24, alignItems: "center", justifyContent: "center", padding: 28 },
  permissionButton: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 13, backgroundColor: "#FFFFFF" },
  permissionButtonText: { color: "#090E1D", fontSize: 14, fontWeight: "700" },
  manualHint: { color: "#FFFFFF", textDecorationLine: "underline", fontSize: 13 },
});
