import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
  Linking,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";

import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { Ionicons } from "@expo/vector-icons";

import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { AppHeader } from "../components/AppHeader";
import { AppInput } from "../components/AppInput";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  getFullName,
  getBalance,
  formatCurrency,
  parseVoiceEntry,
} from "../utils";
import { hapticError, hapticSuccess, hapticTap } from "../utils/haptics";
import { spacing, radius, typography } from "../theme";
import { RootStackParamList, TransactionType } from "../types";
import DateTimePicker from "@react-native-community/datetimepicker";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "AddTransaction">;

export function AddTransactionScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { showToast } = useToast();
  const route = useRoute<Route>();
  const { customerId, type } = route.params;
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const didCloseRouteRef = useRef(false);
  const snapPoints = useMemo(() => ["92%"], []);

  const { addTransaction, getCustomerById, transactions } = useApp();
  const customer = getCustomerById(customerId);
  const currentBalance = getBalance(customerId, transactions);

  const today = new Date();
  const [txType, setTxType] = useState<TransactionType>(type ?? "debt");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(today);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; date?: string }>({});
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const supportsNativeDatePicker =
    Platform.OS === "android" || Platform.OS === "ios";

  const isDebt = txType === "debt";

  const title = isDebt ? "Qarz yozish" : "To'lov oldim";
  const submitLabel = isDebt ? "Qarzni saqlash" : "To'lovni saqlash";
  const bannerBg = isDebt ? theme.debtBg : theme.paymentBg;
  const bannerBorder = isDebt ? theme.debtColor : theme.paymentColor;
  const bannerText = isDebt ? theme.debtColor : theme.paymentColor;

  const balanceText = useMemo(() => {
    if (currentBalance <= 0) return "Qarz yo'q";
    return formatCurrency(currentBalance);
  }, [currentBalance]);

  function toIsoDateOnly(value: Date): string {
    return value.toISOString().split("T")[0];
  }

  function toDisplayDate(value: Date): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";

    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function openDatePicker() {
    if (!supportsNativeDatePicker) return;
    setShowDatePicker(true);
  }

  useEffect(() => {
    bottomSheetRef.current?.present();
  }, []);

  function closeSheet() {
    bottomSheetRef.current?.dismiss();
  }

  function closeRouteSafely() {
    if (didCloseRouteRef.current) return;
    didCloseRouteRef.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    []
  );

  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => setListening(false));
  useSpeechRecognitionEvent("error", () => {
    setListening(false);
    showToast("Ovozli kiritishda xatolik", "error");
  });
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript?.trim();
    if (!transcript) return;
    setVoiceText(transcript);

    const parsed = parseVoiceEntry(transcript);
    if (parsed.amount && parsed.amount > 0) {
      setAmount(String(parsed.amount));
    }
    if (parsed.type) {
      setTxType(parsed.type);
    }
  });

  function validate(): boolean {
    const e: { amount?: string; date?: string } = {};
    const num = parseFloat(amount.replace(/\s/g, "").replace(",", "."));

    if (!amount.trim() || Number.isNaN(num) || num <= 0) {
      e.amount = "Summa 0 dan katta bo'lsin";
    }
    if (Number.isNaN(date.getTime())) {
      e.date = "Sana noto'g'ri";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) {
      hapticError();
      showToast("Formani tekshiring", "error");
      return;
    }

    setSaving(true);
    const num = parseFloat(amount.replace(/\s/g, "").replace(",", "."));

    addTransaction({
      customerId,
      type: txType,
      amount: num,
      date: toIsoDateOnly(date),
      note: note.trim() || (isDebt ? "Qarz" : "To'lov"),
    });

    setSaving(false);
    hapticSuccess();
    showToast(isDebt ? "Qarz yozildi" : "To'lov qo'shildi", "success");
    closeSheet();
  }

  async function handleVoiceToggle() {
    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    const permission =
      await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      hapticError();
      if (permission.canAskAgain === false) {
        showToast("Ruxsat bloklangan. Sozlamadan yoqing", "error");
        Linking.openSettings();
      } else {
        showToast("Mikrofon ruxsati berilmadi", "error");
      }
      return;
    }

    hapticTap();
    showToast("Gapiring: masalan '200 ming qarz'", "info");
    ExpoSpeechRecognitionModule.start({
      lang: "uz-UZ",
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
    });
  }

  return (
    <View style={styles.safe}>
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        onDismiss={closeRouteSafely}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
      >
      <AppHeader
        title={title}
        subtitle={customer ? getFullName(customer) : ""}
        showBack
        onBack={closeSheet}
      />

      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {customer && (
          <View
            style={[
              styles.banner,
              { backgroundColor: bannerBg, borderColor: bannerBorder },
            ]}
          >
            <Text style={[typography.label, { color: bannerText }]}>
              {getFullName(customer)}
            </Text>
            <Text
              style={[
                typography.bodySmall,
                { color: theme.textSecondary, marginTop: 2 },
              ]}
            >
              Joriy qoldiq: {balanceText}
            </Text>
          </View>
        )}

        <View
          style={[
            styles.typeSwitch,
            {
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { backgroundColor: isDebt ? theme.debtBg : "transparent" },
            ]}
            onPress={() => setTxType("debt")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                typography.label,
                { color: isDebt ? theme.debtColor : theme.textSecondary },
              ]}
            >
              Qarz
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeBtn,
              { backgroundColor: !isDebt ? theme.paymentBg : "transparent" },
            ]}
            onPress={() => setTxType("payment")}
            activeOpacity={0.8}
          >
            <Text
              style={[
                typography.label,
                { color: !isDebt ? theme.paymentColor : theme.textSecondary },
              ]}
            >
              To'lov
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleVoiceToggle}
          activeOpacity={0.85}
          style={[
            styles.voiceBtn,
            {
              backgroundColor: listening ? theme.debtBg : theme.surface,
              borderColor: listening ? theme.debtColor : theme.border,
            },
          ]}
        >
          <Text
            style={[
              typography.label,
              { color: listening ? theme.debtColor : theme.textSecondary },
            ]}
          >
            {listening ? "Tinglanyapti... to'xtatish" : "Ovozli kiritish"}
          </Text>
          {voiceText ? (
            <Text
              style={[
                typography.caption,
                { color: theme.textMuted, marginTop: 4 },
              ]}
            >
              {voiceText}
            </Text>
          ) : (
            <Text
              style={[
                typography.caption,
                { color: theme.textMuted, marginTop: 4 },
              ]}
            >
              Misol: "Ali 200 ming qarz"
            </Text>
          )}
        </TouchableOpacity>

        <AppInput
          label="Summa (so'm) *"
          value={amount}
          onChangeText={setAmount}
          placeholder="Masalan: 150000"
          iconName="cash-outline"
          keyboardType="numeric"
          error={errors.amount}
        />
        <View style={styles.dateSection}>
          <Text
            style={[
              typography.label,
              { color: theme.text, marginBottom: spacing.xs },
            ]}
          >
            Sana *
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openDatePicker}
            disabled={!supportsNativeDatePicker}
            style={[
              styles.dateWrap,
              {
                borderColor: theme.border,
                backgroundColor: theme.inputBackground,
              },
            ]}
          >
            <View style={styles.dateDisplay}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={theme.textMuted}
                style={styles.dateIcon}
              />
              <Text style={[typography.bodyMedium, { color: theme.text }]}>
                {toDisplayDate(date)}
              </Text>
            </View>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                onChange={(event, dateTime) => {
                  if (!dateTime) return;
                  if (event.type === "set") {
                    setDate(dateTime);
                  }
                  setShowDatePicker(false);
                }}
                display="calendar"
              />
            )}
          </TouchableOpacity>
          {errors.date ? (
            <Text
              style={[
                typography.bodySmall,
                { color: theme.dangerColor, marginTop: 6 },
              ]}
            >
              {errors.date}
            </Text>
          ) : null}
        </View>
        <AppInput
          label="Izoh (ixtiyoriy)"
          value={note}
          onChangeText={setNote}
          placeholder="Qo'shimcha ma'lumot..."
          iconName="chatbubble-ellipses-outline"
          multiline
          numberOfLines={3}
          style={{ minHeight: 70, paddingTop: 10, textAlignVertical: "top" }}
        />

        <View style={styles.btnWrap}>
          <PrimaryButton
            label={submitLabel}
            onPress={handleSave}
            loading={saving}
            variant={isDebt ? "danger" : "primary"}
          />
          <View style={{ height: spacing.sm }} />
          <PrimaryButton
            label="Bekor qilish"
            onPress={() => {
              hapticTap();
              closeSheet();
            }}
            variant="outline"
          />
        </View>
      </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.md },
  banner: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  typeSwitch: {
    flexDirection: "row",
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
    marginBottom: spacing.lg,
  },
  typeBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  voiceBtn: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  dateSection: {
    marginBottom: spacing.md,
  },
  dateWrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
    justifyContent: "center",
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateIcon: {
    marginRight: spacing.sm,
  },
  pickerHost: {
    minHeight: 56,
    width: 50,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: spacing.md,
  },
  modalPickerWrap: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalActions: {
    marginTop: spacing.md,
  },
  btnWrap: {
    marginTop: spacing.md,
  },
});
