import React, {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetFooter,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetFooterProps,
  type BottomSheetModalProps,
} from "@gorhom/bottom-sheet";
import { KeyboardController } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { SheetRenderProps } from "../types";
import { AndroidSheetKeyboardBridge } from "../AndroidSheetKeyboardBridge";
import { useToast } from "../../context/ToastContext";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { getInitials } from "../../utils";
import { hapticError, hapticSuccess } from "../../utils/haptics";
import { createClientTransaction } from "../../modules/transactions/services/transactionsService";
import { invalidateClientDomain } from "../../core/query/clientInvalidation";
import { getOrganizationQueryScope } from "../../core/query/organizationScope";
import { useTheme } from "../../hooks/useTheme";
import { AppTheme, TransactionType } from "../../types";
import {
  formatLocalizedDisplayedBalance,
  getLocalizedApiErrorMessage,
  useTranslation,
} from "../../i18n";

function getLocalDateOnly(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function formatAmountInput(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 13)
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

type TransactionAmountInputProps = Omit<
  React.ComponentProps<typeof BottomSheetTextInput>,
  "value" | "defaultValue" | "onChangeText"
> & {
  initialValue: string;
  onValueChange: (value: string) => void;
  inputRef?: React.Ref<TransactionInputRef>;
};
type TransactionInputRef = React.ComponentRef<typeof BottomSheetTextInput>;

const TransactionAmountInput = React.memo(
  function TransactionAmountInput({
    initialValue,
    onValueChange,
    inputRef,
    ...rest
  }: TransactionAmountInputProps) {
    const [value, setValue] = useState(initialValue);

    const handleChangeText = React.useCallback(
      (nextValue: string) => {
        const formattedValue = formatAmountInput(nextValue);
        setValue(formattedValue);
        onValueChange(formattedValue);
      },
      [onValueChange],
    );

    return (
      <BottomSheetTextInput
        {...rest}
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
      />
    );
  },
  (previous, next) => {
    const { initialValue: _previousInitial, ...previousRest } = previous;
    const { initialValue: _nextInitial, ...nextRest } = next;
    return Object.keys(previousRest).every(
      (key) =>
        previousRest[key as keyof typeof previousRest] ===
        nextRest[key as keyof typeof nextRest],
    );
  },
);

function useTransactionController({
  props,
  closeSheet,
  setDismissLocked,
}: SheetRenderProps<"transaction">) {
  const { getCustomerById } = useApp();
  const { user, currentOrganization } = useAuth();
  const customer = getCustomerById(props.customerId);
  const { scope, enabled } = getOrganizationQueryScope(
    user?.id,
    currentOrganization?.id,
  );
  const { showToast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState<TransactionType | null>(null);
  const [previewType, setPreviewType] = useState<TransactionType>(
    props.type ?? "debt",
  );
  const submitting = useRef(false);
  const parsedAmount = Number(amount.replace(/\s/g, ""));
  const validAmount = Number.isSafeInteger(parsedAmount) && parsedAmount > 0;
  const currentBalance = props.currentBalance ?? customer?.currentBalance ?? 0;
  const nextBalance =
    currentBalance +
    (validAmount ? (previewType === "debt" ? parsedAmount : -parsedAmount) : 0);
  const name =
    customer?.fullName ||
    props.customerName ||
    props.customerPhone ||
    t("transactions.customerFallback");
  const phone = customer?.phone ?? props.customerPhone ?? "";
  const initials = getInitials({ id: props.customerId, fullName: name, phone });

  async function save(type: TransactionType) {
    if (submitting.current) return;
    if (!enabled) {
      hapticError();
      showToast(t("profile.organizationNotSelected"), "error");
      return;
    }
    if (!validAmount) {
      hapticError();
      showToast(t("transactions.amountError"), "error");
      return;
    }
    submitting.current = true;
    setSaving(type);
    setDismissLocked(true);
    setPreviewType(type);
    Keyboard.dismiss();
    void KeyboardController.dismiss();
    try {
      await createClientTransaction(props.customerId, {
        type,
        amount: parsedAmount,
        date: getLocalDateOnly(),
        note:
          note.trim() ||
          (type === "debt"
            ? t("transactions.debtNote")
            : t("transactions.paymentNote")),
      });
      // A completed POST must not fail just because a background refresh failed.
      void invalidateClientDomain(
        queryClient,
        scope,
        "transaction",
        props.customerId,
      ).catch(() => undefined);
      hapticSuccess();
      showToast(
        type === "debt"
          ? t("transactions.debtSaved")
          : t("transactions.paymentSaved"),
        "success",
      );
      setDismissLocked(false);
      closeSheet();
    } catch (error) {
      hapticError();
      showToast(
        getLocalizedApiErrorMessage(error, "transactions.saveError", t),
        "error",
      );
      submitting.current = false;
      setSaving(null);
      setDismissLocked(false);
    }
  }
  return {
    props,
    closeSheet,
    amount,
    setAmount,
    note,
    setNote,
    saving,
    previewType,
    setPreviewType,
    validAmount,
    currentBalance,
    nextBalance,
    name,
    phone,
    initials,
    save,
  };
}

const TransactionContext = createContext<ReturnType<
  typeof useTransactionController
> | null>(null);
function useTransaction() {
  const context = useContext(TransactionContext);
  if (!context) throw new Error("Transaction sheet must have its controller");
  return context;
}

export function TransactionSheetProvider({
  children,
  ...props
}: SheetRenderProps<"transaction"> & { children: ReactNode }) {
  const value = useTransactionController(props);
  const modal = React.Children.only(
    children,
  ) as ReactElement<BottomSheetModalProps>;
  const [store] = useState(() => {
    let snapshot = value;
    const listeners = new Set<() => void>();
    return {
      getSnapshot: () => snapshot,
      subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
      update: (next: typeof value) => {
        snapshot = next;
        listeners.forEach((listener) => listener());
      },
    };
  });
  useLayoutEffect(() => store.update(value), [store, value]);
  // Keep the footer component identity stable so press-in state updates cannot
  // remount the button and cancel its ensuing press/submit event.
  const footer = useMemo(
    () =>
      function FooterBridge(footerProps: BottomSheetFooterProps) {
        const snapshot = useSyncExternalStore(
          store.subscribe,
          store.getSnapshot,
          store.getSnapshot,
        );
        return (
          <TransactionContext.Provider value={snapshot}>
            <TransactionFooter {...footerProps} />
          </TransactionContext.Provider>
        );
      },
    [store],
  );
  // Modal content is portaled: put the controller inside BOTH rendered slots.
  return React.cloneElement(
    modal,
    { footerComponent: footer },
    <TransactionContext.Provider value={value}>
      {typeof modal.props.children === "function"
        ? React.createElement(modal.props.children)
        : modal.props.children}
    </TransactionContext.Provider>,
  );
}

function TransactionFooter(footerProps: BottomSheetFooterProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { saving, validAmount, save, setPreviewType } = useTransaction();
  return (
    <BottomSheetFooter {...footerProps} bottomInset={insets.bottom}>
      <View style={styles.footer}>
        {(["payment", "debt"] as const).map((type) => (
          <Pressable
            key={type}
            accessibilityRole="button"
            accessibilityLabel={
              type === "debt" ? t("transactions.addDebt") : t("transactions.takePayment")
            }
            accessibilityState={{
              disabled: !!saving || !validAmount,
              busy: saving === type,
            }}
            disabled={!!saving || !validAmount}
            onPressIn={() => setPreviewType(type)}
            onPress={() => void save(type)}
            style={({ pressed }) => [
              styles.action,
              {
                backgroundColor:
                  type === "debt" ? theme.dangerColor : theme.paymentColor,
              },
              (!validAmount || !!saving || pressed) && styles.disabled,
            ]}
          >
            {saving === type ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons
                name={type === "debt" ? "add-circle-outline" : "wallet-outline"}
                size={24}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.actionText}>
              {type === "debt" ? t("transactions.addDebt") : t("transactions.takePayment")}
            </Text>
          </Pressable>
        ))}
      </View>
    </BottomSheetFooter>
  );
}

export function TransactionSheet(_: SheetRenderProps<"transaction">) {
  const theme = useTheme();
  const { locale, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const tx = useTransaction();
  const [focused, setFocused] = useState<"amount" | "note" | null>(null);
  const amountRef = useRef<TransactionInputRef>(null);
  const noteRef = useRef<TransactionInputRef>(null);
  const dismissKeyboard = React.useCallback(() => {
    Keyboard.dismiss();
    void KeyboardController.dismiss();
  }, []);
  const handleAmountFocus = React.useCallback(() => setFocused("amount"), []);
  const handleNoteFocus = React.useCallback(() => setFocused("note"), []);
  const handleFieldBlur = React.useCallback(() => setFocused(null), []);
  return (
    <BottomSheetScrollView
      enableFooterMarginAdjustment
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 12 },
      ]}
      keyboardShouldPersistTaps="always"
      keyboardDismissMode="interactive"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <AndroidSheetKeyboardBridge />
      <View style={styles.header}>
        <Text style={styles.title}>{t("transactions.operation")}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("transactions.close")}
          disabled={!!tx.saving}
          onPress={() => tx.closeSheet()}
          style={styles.close}
        >
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.customer}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>{tx.initials}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {tx.name}
          </Text>
          {!!tx.phone && (
            <Text style={styles.phone} numberOfLines={1}>
              {tx.phone}
            </Text>
          )}
          <Text
            style={[
              styles.balance,
              {
                color:
                  tx.currentBalance > 0 ? theme.debtColor : theme.paymentColor,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatLocalizedDisplayedBalance(tx.currentBalance, locale)}
          </Text>
        </View>
        {tx.props.onOpenProfile && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("transactions.customerProfile")}
            disabled={!!tx.saving}
            onPress={() => tx.closeSheet(tx.props.onOpenProfile)}
            style={styles.profile}
          >
            <Ionicons name="person-outline" size={19} color={theme.primary} />
            <Text style={styles.profileText}>{t("transactions.profile")}</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </Pressable>
        )}
      </View>
      <Pressable
        onPress={() => amountRef.current?.focus()}
        style={[styles.amountField, focused === "amount" && styles.focused]}
      >
        <View style={styles.amountCopy}>
          <Text style={styles.label}>{t("transactions.amount")}</Text>
          <TransactionAmountInput
            inputRef={amountRef}
            initialValue=""
            onValueChange={tx.setAmount}
            editable={!tx.saving}
            keyboardType="number-pad"
            returnKeyType="none"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={dismissKeyboard}
            placeholder={t("transactions.amountPlaceholder")}
            placeholderTextColor={theme.textMuted}
            selectionColor={theme.primary}
            onFocus={handleAmountFocus}
            onBlur={handleFieldBlur}
            style={styles.amountInput}
            accessibilityLabel={t("transactions.amountA11y")}
          />
        </View>
        <Text style={styles.currency}>{t("transactions.currency")}</Text>
      </Pressable>
      <Pressable
        onPress={() => noteRef.current?.focus()}
        style={[styles.noteField, focused === "note" && styles.focused]}
      >
        <Text style={styles.label}>{t("transactions.note")}</Text>
        <BottomSheetTextInput
          ref={noteRef}
          value={tx.note}
          onChangeText={tx.setNote}
          editable={!tx.saving}
          placeholder={t("transactions.notePlaceholder")}
          placeholderTextColor={theme.textMuted}
          selectionColor={theme.primary}
          multiline
          maxLength={250}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          onSubmitEditing={dismissKeyboard}
          onFocus={handleNoteFocus}
          onBlur={handleFieldBlur}
          style={styles.noteInput}
          accessibilityLabel={t("transactions.noteA11y")}
        />
      </Pressable>
      <View style={styles.preview}>
        <Text style={styles.previewLabel}>
          {t("transactions.nextBalance")} {tx.previewType === "payment" ? `(${t("transactions.paymentPreview")})` : `(${t("transactions.debtPreview")})`}
          :
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.nextBalance,
            {
              color: tx.nextBalance > 0 ? theme.debtColor : theme.paymentColor,
            },
          ]}
        >
          {formatLocalizedDisplayedBalance(tx.nextBalance, locale)}
        </Text>
      </View>
    </BottomSheetScrollView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    content: { paddingHorizontal: 16, gap: 12 },
    header: { flexDirection: "row", alignItems: "center" },
    title: { flex: 1, color: theme.text, fontSize: 19, fontWeight: "800" },
    close: {
      width: 44,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -8,
    },
    customer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: theme.inputBackground,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: theme.primaryLight,
      alignItems: "center",
      justifyContent: "center",
    },
    initials: { fontSize: 22, fontWeight: "800", color: theme.primary },
    identity: { flex: 1, minWidth: 0, gap: 2 },
    name: { fontSize: 16, fontWeight: "700", color: theme.text },
    phone: {
      fontSize: 12,
      color: theme.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    balance: { fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
    profile: {
      minHeight: 40,
      paddingHorizontal: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.surface,
    },
    profileText: { fontSize: 12, fontWeight: "700", color: theme.primary },
    amountField: {
      minHeight: 64,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    amountCopy: { flex: 1 },
    label: { fontSize: 11, lineHeight: 16, color: theme.textMuted },
    amountInput: {
      minHeight: 30,
      color: theme.text,
      paddingVertical: 0,
      paddingHorizontal: 0,
      fontSize: 21,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    currency: {
      paddingLeft: 14,
      borderLeftWidth: 1,
      borderLeftColor: theme.border,
      color: theme.textMuted,
      fontSize: 16,
      fontWeight: "600",
    },
    noteField: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    noteInput: {
      minHeight: 34,
      maxHeight: 90,
      textAlignVertical: "top",
      color: theme.text,
      fontSize: 15,
      padding: 0,
    },
    focused: { borderColor: theme.primary },
    preview: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
    },
    previewLabel: { flex: 1, color: theme.text, fontSize: 12 },
    nextBalance: {
      maxWidth: "55%",
      fontSize: 15,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    footer: {
      flexDirection: "row",
      gap: 10,
      padding: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
    },
    action: {
      flex: 1,
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      borderRadius: 12,
      paddingHorizontal: 8,
    },
    actionText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
    disabled: { opacity: 0.55 },
  });
