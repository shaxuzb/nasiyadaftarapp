import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
  Keyboard,
  ScrollViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  KeyboardAwareScrollView,
  KeyboardToolbar,
} from "react-native-keyboard-controller";
import * as Contacts from "expo-contacts";

import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { SearchBar } from "../components/SearchBar";
import { CustomerCard } from "../modules/clients/components/CustomerCard";
import { CustomerCardSkeleton } from "../modules/clients/components/CustomerCardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppInput } from "../components/AppInput";
import { createBalanceMap } from "../modules/clients/utils/clientCalculations";
import { hapticError, hapticSuccess, hapticTap } from "../utils/haptics";
import { AppTheme, RootStackParamList } from "../types";
import { useBottomSheet } from "../bottom-sheet";
import {
  formatUzPhoneFromDigits,
  isValidUzPhone,
  toStoredUzPhone,
} from "../utils/masks";
import { getApiErrorMessage } from "../utils/apiError";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const KeyboardBottomSheetScrollView =
  BottomSheetScrollView as unknown as React.ComponentType<ScrollViewProps>;

function ListSeparator() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return <View style={styles.listSeparator} />;
}

const SHEET_SPRING = {
  damping: 80,
  stiffness: 500,
  mass: 0.8,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

export function CustomersScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const {
    customers,
    transactions,
    addCustomer,
    refreshCustomers,
    isLoadingCustomers,
  } = useApp();
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["78%"], []);

  const [query, setQuery] = useState("");
  const [debtorOnly, setDebtorOnly] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});

  const balanceMap = useMemo(
    () => createBalanceMap(transactions),
    [transactions],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const balance =
        customer.currentBalance ?? balanceMap.get(customer.id) ?? 0;
      if (debtorOnly && balance <= 0) return false;
      if (!q) return true;

      return (
        customer.firstName.toLowerCase().includes(q) ||
        customer.lastName.toLowerCase().includes(q) ||
        `${customer.firstName} ${customer.lastName}`
          .toLowerCase()
          .includes(q) ||
        customer.phone.toLowerCase().includes(q) ||
        String(customer.id).includes(q)
      );
    });
  }, [balanceMap, customers, debtorOnly, query]);

  const latestTransactionMap = useMemo(() => {
    const latestByCustomer = new Map<number, number>();
    for (const transaction of transactions) {
      const timestamp = new Date(transaction.date).getTime();
      const current = latestByCustomer.get(transaction.customerId) ?? 0;
      if (Number.isFinite(timestamp) && timestamp > current) {
        latestByCustomer.set(transaction.customerId, timestamp);
      }
    }
    return latestByCustomer;
  }, [transactions]);

  const listData = useMemo(() => {
    const now = Date.now();
    return filtered.map((customer) => {
      const lastTransactionAt = latestTransactionMap.get(customer.id);
      const lastTxDaysAgo = lastTransactionAt
        ? Math.max(0, Math.floor((now - lastTransactionAt) / 86_400_000))
        : undefined;
      return {
        customer,
        balance: customer.currentBalance ?? balanceMap.get(customer.id) ?? 0,
        lastTxDaysAgo,
      };
    });
  }, [balanceMap, filtered, latestTransactionMap]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );

  function splitContactName(fullName: string): {
    firstName: string;
    lastName: string;
  } {
    const name = fullName.trim().replace(/\s+/g, " ");
    if (!name) return { firstName: "", lastName: "" };

    const parts = name.split(" ");
    const first = parts[0] ?? "";
    const last = parts.slice(1).join(" ");
    return { firstName: first, lastName: last };
  }

  function openAddCustomerSheet() {
    hapticTap();
    bottomSheetRef.current?.present();
  }

  function closeAddCustomerSheet() {
    Keyboard.dismiss();
    bottomSheetRef.current?.dismiss();
  }

  function resetCustomerForm() {
    setFirstName("");
    setLastName("");
    setPhone("+998 ");
    setErrors({});
    setIsCreatingCustomer(false);
  }

  function validateForm(): boolean {
    const e: { firstName?: string; lastName?: string; phone?: string } = {};

    if (!firstName.trim()) e.firstName = "Ismni kiriting";
    if (!lastName.trim()) e.lastName = "Familiyani kiriting";
    if (!isValidUzPhone(phone))
      e.phone = "Telefon raqami noto'g'ri (+998 XX XXX XX XX)";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateCustomer() {
    if (!validateForm()) {
      hapticError();
      showToast("Formani tekshiring", "error");
      return;
    }

    Keyboard.dismiss();

    try {
      setIsCreatingCustomer(true);
      const customer = await addCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: toStoredUzPhone(phone),
        note: "",
      });

      resetCustomerForm();
      closeAddCustomerSheet();
      hapticSuccess();
      showToast("Mijoz qo'shildi", "success");
      navigation.navigate("CustomerDetail", { customerId: customer.id });
    } catch (error) {
      hapticError();
      showToast(
        getApiErrorMessage(error, "Mijoz qo'shishda xatolik"),
        "error",
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  async function handlePickFromContacts() {
    try {
      const existingPermission = await Contacts.getPermissionsAsync();
      const permission =
        existingPermission.status === "granted"
          ? existingPermission
          : await Contacts.requestPermissionsAsync();

      if (permission.status !== "granted") {
        hapticError();
        if (permission.canAskAgain === false) {
          showToast("Kontakt ruxsati bloklangan. Sozlamadan yoqing", "error");
          Linking.openSettings();
        } else {
          showToast("Kontaktlar ruxsati berilmadi", "error");
        }
        return;
      }

      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;

      const fullName =
        contact.name ||
        [contact.firstName, contact.lastName].filter(Boolean).join(" ");
      const phoneValue = contact.phoneNumbers?.[0]?.number ?? "";
      const parsedName = splitContactName(fullName);

      setFirstName(parsedName.firstName);
      setLastName(parsedName.lastName);
      setPhone(formatUzPhoneFromDigits(phoneValue));
      setErrors({});
      showToast("Kontaktdan ma'lumot to'ldirildi", "success");
    } catch {
      hapticError();
      showToast("Kontaktlarni ochib bo'lmadi", "error");
    }
  }

  type ListItem = (typeof listData)[0];

  const keyExtractor = useCallback(
    (item: ListItem) => String(item.customer.id),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <CustomerCard
        customer={item.customer}
        balance={item.balance}
        lastTxDaysAgo={item.lastTxDaysAgo}
        onPress={() =>
          navigation.navigate("CustomerDetail", {
            customerId: item.customer.id,
          })
        }
        onAddDebt={() => {
          hapticTap();
          openSheet("transaction", {
            customerId: item.customer.id,
            type: "debt",
            customerName:
              `${item.customer.firstName} ${item.customer.lastName}`.trim(),
            currentBalance: item.balance,
          });
        }}
        onAddPayment={() => {
          hapticTap();
          openSheet("transaction", {
            customerId: item.customer.id,
            type: "payment",
            customerName:
              `${item.customer.firstName} ${item.customer.lastName}`.trim(),
            currentBalance: item.balance,
          });
        }}
      />
    ),
    [navigation, openSheet],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.mainKeyboardWrap}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleBlock}>
              <Text style={styles.screenTitle}>Mijozlar</Text>
              <Text style={styles.screenSubtitle}>
                Qarz va to'lovlarni boshqaring
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Yangi mijoz qo'shish"
              onPress={openAddCustomerSheet}
              activeOpacity={0.82}
              style={styles.addBtn}
            >
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar
              value={query}
              onChangeText={setQuery}
              placeholder="Ism, telefon yoki mijoz ID"
              filterActive={debtorOnly}
              onFilterPress={() => {
                hapticTap();
                setDebtorOnly((value) => !value);
              }}
            />
          </View>
        </View>

        <FlatList
          data={isLoadingCustomers && listData.length === 0 ? [] : listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={styles.list}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          scrollIndicatorInsets={{ top: 2 }}
          ListEmptyComponent={
            isLoadingCustomers && listData.length === 0 ? (
              <>
                <CustomerCardSkeleton />
                <CustomerCardSkeleton />
                <CustomerCardSkeleton />
              </>
            ) : (
              <EmptyState
                iconName="people-outline"
                title={
                  query
                    ? "Topilmadi"
                    : debtorOnly
                      ? "Qarzdor mijoz yo'q"
                      : "Hali mijoz yo'q"
                }
                description={
                  query
                    ? `"${query}" bo'yicha natija topilmadi`
                    : debtorOnly
                      ? "Hozir barcha mijozlarning qarzi yopilgan"
                      : "Boshlash uchun avval mijoz qo'shing"
                }
                action={
                  !query && !debtorOnly ? (
                    <PrimaryButton
                      label="Mijoz qo'shish"
                      onPress={openAddCustomerSheet}
                    />
                  ) : undefined
                }
              />
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoadingCustomers}
              onRefresh={() => {
                void refreshCustomers();
              }}
              tintColor={theme.primary}
            />
          }
        />
      </View>
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        enableBlurKeyboardOnGesture
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        enableOverDrag={false}
        animationConfigs={SHEET_SPRING}
        onDismiss={resetCustomerForm}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <View style={styles.sheetKeyboardWrap}>
          <KeyboardAwareScrollView
            ScrollViewComponent={KeyboardBottomSheetScrollView}
            style={styles.sheetKeyboardScroll}
            bottomOffset={72}
            extraKeyboardSpace={16}
            disableScrollOnKeyboardHide={false}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderIcon}>
                <Ionicons
                  name="person-add-outline"
                  size={22}
                  color={theme.primary}
                />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetTitle}>Yangi mijoz</Text>
                <Text style={styles.sheetSubtitle}>
                  Mijoz ma'lumotlarini kiriting
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Yopish"
                activeOpacity={0.72}
                onPress={closeAddCustomerSheet}
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={handlePickFromContacts}
              style={styles.contactPickerButton}
            >
              <View style={styles.contactPickerIcon}>
                <Ionicons
                  name="people-outline"
                  size={21}
                  color={theme.primary}
                />
              </View>
              <View style={styles.contactPickerText}>
                <Text style={styles.contactPickerTitle}>
                  Kontaktdan tanlash
                </Text>
                <Text style={styles.contactPickerSubtitle}>
                  Ism va telefon avtomatik to'ldiriladi
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={21}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.sheetFields}>
              <AppInput
                variant="sheet"
                label="Ism *"
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  if (errors.firstName) {
                    setErrors((current) => ({
                      ...current,
                      firstName: undefined,
                    }));
                  }
                }}
                placeholder="Masalan: Ali"
                iconName="person-outline"
                autoCapitalize="words"
                // returnKeyType="next"
                error={errors.firstName}
              />
              <AppInput
                variant="sheet"
                label="Familiya *"
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  if (errors.lastName) {
                    setErrors((current) => ({
                      ...current,
                      lastName: undefined,
                    }));
                  }
                }}
                placeholder="Masalan: Valiyev"
                iconName="person-outline"
                autoCapitalize="words"
                returnKeyType="next"
                error={errors.lastName}
              />
              <AppInput
                variant="sheet"
                label="Telefon raqami *"
                value={phone}
                onChangeText={(value) => {
                  setPhone(formatUzPhoneFromDigits(value));
                  if (errors.phone) {
                    setErrors((current) => ({ ...current, phone: undefined }));
                  }
                }}
                placeholder="+998 XX XXX XX XX"
                iconName="call-outline"
                keyboardType="phone-pad"
                returnKeyType="done"
                error={errors.phone}
              />
            </View>

            <View style={styles.sheetActions}>
              <Text style={styles.requiredHint}>* Majburiy maydonlar</Text>
              <PrimaryButton
                label="Mijozni saqlash"
                onPress={handleCreateCustomer}
                loading={isCreatingCustomer}
                style={styles.sheetSaveButton}
              />
            </View>
          </KeyboardAwareScrollView>
          <KeyboardToolbar
            doneText="Tayyor"
            showArrows
            onDoneCallback={Keyboard.dismiss}
          />
        </View>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: theme.background,
    },
    mainKeyboardWrap: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      gap: 16,
    },
    headerTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
    },
    titleBlock: {
      flex: 1,
      gap: 2,
    },
    screenTitle: {
      color: theme.text,
      fontSize: 26,
      lineHeight: 29,
      fontWeight: "800",
      letterSpacing: -0.8,
    },
    screenSubtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 16,
      fontWeight: "400",
    },
    addBtn: {
      width: 44,
      height: 44,
      borderRadius: 27,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primary,
      boxShadow: theme.cardShadow,
    },
    searchWrap: {},
    list: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 28,
      flexGrow: 1,
    },
    listSeparator: {
      height: 12,
    },
    sheetBackground: {
      backgroundColor: theme.surface,
      borderRadius: 26,
      borderCurve: "continuous",
    },
    sheetHandle: {
      width: 42,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.textMuted,
    },
    sheetContent: {
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 32,
      gap: 16,
      backgroundColor: theme.surface,
    },
    sheetKeyboardWrap: {
      flex: 1,
    },
    sheetKeyboardScroll: {
      flex: 1,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    sheetHeaderIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    sheetHeaderText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    sheetTitle: {
      color: theme.text,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    sheetSubtitle: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "500",
    },
    sheetCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
    },
    contactPickerButton: {
      minHeight: 66,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingHorizontal: 13,
      backgroundColor: theme.primaryLight,
      borderWidth: 1,
      borderColor: theme.primary,
      borderRadius: 16,
      borderCurve: "continuous",
    },
    contactPickerIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceElevated,
    },
    contactPickerText: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    contactPickerTitle: {
      color: theme.primary,
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "700",
    },
    contactPickerSubtitle: {
      color: theme.textSecondary,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "500",
    },
    sheetFields: {
      paddingTop: 2,
    },
    sheetActions: {
      gap: 8,
    },
    requiredHint: {
      color: theme.textMuted,
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "500",
    },
    sheetSaveButton: {
      height: 56,
      borderRadius: 15,
      backgroundColor: theme.primary,
      boxShadow: theme.cardShadow,
    },
  });
