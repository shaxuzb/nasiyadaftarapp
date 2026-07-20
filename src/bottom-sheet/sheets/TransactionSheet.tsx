import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollViewProps,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";

import { SheetRenderProps } from "../types";
import { useToast } from "../../context/ToastContext";
import { formatCurrency } from "../../utils";
import { hapticError, hapticSuccess } from "../../utils/haptics";
import { createClientTransaction } from "../../modules/transactions/services/transactionsService";
import { queryClient } from "../../core/query/queryClient";

function getLocalDateOnly(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const KeyboardBottomSheetScrollView = BottomSheetScrollView as unknown as
  React.ComponentType<ScrollViewProps>;

export function TransactionSheet({
  props,
  closeSheet,
}: SheetRenderProps<"transaction">) {
  const { showToast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [noteFocused, setNoteFocused] = useState(false);

  const transactionType = props.type ?? "debt";
  const isDebt = transactionType === "debt";
  const currentBalance = Math.max(props.currentBalance ?? 0, 0);
  const accentColor = isDebt ? "#0B5DEB" : "#159447";
  const accentBackground = isDebt ? "#E7F0FF" : "#E7F8ED";

  const parsedAmount = useMemo(
    () => Number(amount.replace(/\s/g, "").replace(",", ".")),
    [amount],
  );

  const nextBalance = useMemo(() => {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return currentBalance;
    }
    return isDebt
      ? currentBalance + parsedAmount
      : Math.max(currentBalance - parsedAmount, 0);
  }, [currentBalance, isDebt, parsedAmount]);

  async function handleSave() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      hapticError();
      showToast("Summa 0 dan katta bo'lishi kerak", "error");
      return;
    }

    Keyboard.dismiss();

    try {
      setSaving(true);
      await createClientTransaction(props.customerId, {
        type: transactionType,
        amount: parsedAmount,
        date: getLocalDateOnly(),
        note: note.trim() || (isDebt ? "Qarz" : "To'lov"),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);

      hapticSuccess();
      showToast(isDebt ? "Qarz yozildi" : "To'lov qo'shildi", "success");
      closeSheet();
    } catch {
      hapticError();
      showToast("Tranzaksiya saqlanmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.keyboardWrap}>
      <KeyboardAwareScrollView
        ScrollViewComponent={KeyboardBottomSheetScrollView}
        style={styles.keyboardScroll}
        bottomOffset={24}
        extraKeyboardSpace={12}
        disableScrollOnKeyboardHide={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: accentBackground }]}>
            <Ionicons
              name={isDebt ? "arrow-down" : "arrow-up"}
              size={22}
              color={accentColor}
            />
          </View>
          <Text style={styles.title}>
            {isDebt ? "Qarz yozish" : "To'lov olish"}
          </Text>
          <Text selectable style={styles.customerName} numberOfLines={1}>
            {props.customerName ?? "Mijoz"}
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Summa</Text>
          <View
            style={[
              styles.amountField,
              amountFocused && { borderColor: accentColor, borderWidth: 1.5 },
            ]}
          >
            <BottomSheetTextInput
              value={amount}
              onChangeText={(value) => setAmount(formatAmountInput(value))}
              keyboardType="number-pad"
              returnKeyType="next"
              blurOnSubmit={false}
              maxLength={19}
              placeholder={isDebt ? "Qarz summasi" : "To'lov summasi"}
              placeholderTextColor="#8A98AC"
              selectionColor={accentColor}
              cursorColor={accentColor}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              style={styles.amountInput}
            />
            <Text style={styles.currencySuffix}>so'm</Text>
          </View>
        </View>

        <View style={styles.balanceCard}>
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Joriy qoldiq</Text>
            <Text selectable style={styles.balanceValue} numberOfLines={1}>
              {formatCurrency(currentBalance)}
            </Text>
          </View>
          <View style={styles.balanceDivider} />
          <View style={styles.balanceItem}>
            <Text style={styles.balanceLabel}>Keyingi qoldiq</Text>
            <Text
              selectable
              style={[styles.balanceValue, { color: accentColor }]}
              numberOfLines={1}
            >
              {formatCurrency(nextBalance)}
            </Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Izoh</Text>
          <View
            style={[
              styles.noteField,
              noteFocused && { borderColor: accentColor, borderWidth: 1.5 },
            ]}
          >
            <BottomSheetTextInput
              value={note}
              onChangeText={setNote}
              placeholder="Qo'shimcha ma'lumot"
              placeholderTextColor="#8A98AC"
              selectionColor={accentColor}
              cursorColor={accentColor}
              multiline
              textAlignVertical="top"
              maxLength={250}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={Keyboard.dismiss}
              onFocus={() => setNoteFocused(true)}
              onBlur={() => setNoteFocused(false)}
              style={styles.noteInput}
            />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isDebt ? "Qarzni saqlash" : "To'lovni saqlash"}
          disabled={saving}
          onPress={handleSave}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: accentColor },
            (pressed || saving) && styles.saveButtonPressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Saqlash</Text>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
      <KeyboardToolbar
        doneText="Tayyor"
        showArrows
        onDoneCallback={Keyboard.dismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  keyboardScroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 36,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  header: {
    alignItems: "center",
    gap: 3,
    paddingBottom: 2,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  title: {
    color: "#071426",
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  customerName: {
    color: "#60728F",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: "#172A49",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  amountField: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 15,
    borderCurve: "continuous",
  },
  amountInput: {
    flex: 1,
    color: "#071426",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    paddingVertical: 0,
    fontVariant: ["tabular-nums"],
  },
  currencySuffix: {
    color: "#71819A",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  balanceCard: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "stretch",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#F7F9FC",
    borderWidth: 1,
    borderColor: "#EDF1F6",
    borderRadius: 15,
    borderCurve: "continuous",
  },
  balanceItem: {
    minWidth: 0,
    flex: 1,
    justifyContent: "center",
    gap: 5,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: "#DDE5EF",
    marginHorizontal: 14,
  },
  balanceLabel: {
    color: "#71819A",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  balanceValue: {
    color: "#172A49",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  noteField: {
    minHeight: 88,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE5EF",
    borderRadius: 15,
    borderCurve: "continuous",
  },
  noteInput: {
    minHeight: 60,
    color: "#071426",
    fontSize: 14,
    lineHeight: 20,
    padding: 0,
  },
  saveButton: {
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    borderCurve: "continuous",
    boxShadow: "0 8px 18px rgba(11, 93, 235, 0.20)",
  },
  saveButtonPressed: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "800",
  },
});
