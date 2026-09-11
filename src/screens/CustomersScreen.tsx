import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
  RefreshControl,
  TextInput,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { KeyboardController } from "react-native-keyboard-controller";
import * as Contacts from "expo-contacts";

import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { SearchBar } from "../components/SearchBar";
import { CustomerCard } from "../modules/clients/components/CustomerCard";
import { CustomerCardSkeleton } from "../modules/clients/components/CustomerCardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppInput } from "../components/AppInput";
import { createBalanceMap } from "../modules/clients/utils/clientCalculations";
import { useClientSearch } from "../modules/clients/hooks/useClientSearch";
import { getCustomerCountLabel } from "../modules/clients/utils/clientList";
import { hapticError, hapticSuccess, hapticTap } from "../utils/haptics";
import { AppTheme, RootStackParamList } from "../types";
import { useBottomSheet, useBottomSheetBackHandler } from "../bottom-sheet";
import { AndroidSheetKeyboardBridge } from "../bottom-sheet/AndroidSheetKeyboardBridge";
import {
  formatUzPhoneFromDigits,
  isValidUzPhone,
  toStoredUzPhone,
} from "../utils/masks";
import { getApiErrorMessage } from "../utils/apiError";

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

const EMPTY_BALANCE_MAP = new Map<number, number>();

export function CustomersScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const {
    customers,
    transactions,
    addCustomer,
    refreshCustomers,
    isLoadingCustomers,
    dataError,
  } = useApp();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const [isAddCustomerSheetOpen, setIsAddCustomerSheetOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debtorOnly, setDebtorOnly] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [phoneInputKey, setPhoneInputKey] = useState(0);
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [errors, setErrors] = useState<{ phone?: string }>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearchChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setDebouncedQuery("");
    }
  }, []);

  const handleAddPhoneChange = useCallback((value: string) => {
    setPhone(formatUzPhoneFromDigits(value));
    setErrors((current) =>
      current.phone ? { ...current, phone: undefined } : current,
    );
  }, []);
  const handleAddPhoneSubmit = useCallback(() => {
    void KeyboardController.dismiss();
  }, []);

  const scope = user?.organizationId ?? user?.id ?? "anonymous";
  const isSearchActive = debouncedQuery.length > 0;
  const {
    result: searchResult,
    isLoading: isSearchLoading,
    error: searchError,
    refetch: refetchSearch,
  } = useClientSearch(scope, Boolean(user), debouncedQuery);

  const sourceCustomers = isSearchActive ? searchResult.customers : customers;
  const requiresCalculatedBalances = useMemo(
    () => sourceCustomers.some((customer) => customer.currentBalance == null),
    [sourceCustomers],
  );

  const balanceMap = useMemo(
    () =>
      requiresCalculatedBalances
        ? createBalanceMap(transactions)
        : EMPTY_BALANCE_MAP,
    [requiresCalculatedBalances, transactions],
  );

  const filteredCustomers = useMemo(() => {
    if (!debtorOnly) return sourceCustomers;

    return sourceCustomers.filter((customer) => {
      const balance =
        customer.currentBalance ?? balanceMap.get(customer.id) ?? 0;
      return balance > 0;
    });
  }, [balanceMap, debtorOnly, sourceCustomers]);

  const listData = useMemo(() => {
    return filteredCustomers.map((customer) => ({
      customer,
      balance: customer.currentBalance ?? balanceMap.get(customer.id) ?? 0,
    }));
  }, [balanceMap, filteredCustomers]);

  const customerCountLabel = useMemo(
    () =>
      getCustomerCountLabel({
        visibleCount: listData.length,
        serverCount: isSearchActive ? searchResult.count : customers.length,
        query: debouncedQuery,
        debtorOnly,
      }),
    [
      customers.length,
      debouncedQuery,
      debtorOnly,
      isSearchActive,
      listData.length,
      searchResult.count,
    ],
  );

  const listError = isSearchActive ? searchError : dataError;
  const isListLoading = isSearchActive ? isSearchLoading : isLoadingCustomers;

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
      />
    ),
    [],
  );

  function openAddCustomerSheet() {
    hapticTap();
    setIsAddCustomerSheetOpen(true);
    bottomSheetRef.current?.present();
  }

  function closeAddCustomerSheet() {
    setIsAddCustomerSheetOpen(false);
    void KeyboardController.dismiss();
    bottomSheetRef.current?.dismiss();
  }

  useBottomSheetBackHandler(isAddCustomerSheetOpen, closeAddCustomerSheet);

  function resetCustomerForm() {
    setFullName("");
    setPhone("+998 ");
    setPhoneInputKey((key) => key + 1);
    setErrors({});
    setIsCreatingCustomer(false);
  }

  function validateForm(): boolean {
    const e: { phone?: string } = {};

    if (!isValidUzPhone(phone))
      e.phone = "Telefon raqami noto'g'ri (+998 XX XXX XX XX)";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateCustomer() {
    if (isCreatingCustomer) return;
    if (!validateForm()) {
      hapticError();
      showToast("Formani tekshiring", "error");
      return;
    }

    void KeyboardController.dismiss();

    try {
      setIsCreatingCustomer(true);
      await addCustomer({
        fullName: fullName.trim().replace(/\s+/g, " "),
        phone: toStoredUzPhone(phone),
        note: "",
      });

      resetCustomerForm();
      closeAddCustomerSheet();
      hapticSuccess();
      showToast("Mijoz qo'shildi", "success");
    } catch (error) {
      hapticError();
      showToast(getApiErrorMessage(error, "Mijoz qo'shishda xatolik"), "error");
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  async function handlePickFromContacts() {
    try {
      await KeyboardController.dismiss();
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

      const contactFullName =
        contact.name?.trim() ||
        [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
      const phoneValue = contact.phoneNumbers?.[0]?.number ?? "";

      if (!contactFullName && !phoneValue) {
        showToast("Kontakt ma'lumotlari topilmadi", "error");
        return;
      }

      setFullName(contactFullName.replace(/\s+/g, " "));
      setPhone(formatUzPhoneFromDigits(phoneValue));
      setPhoneInputKey((key) => key + 1);
      setErrors({});
      showToast("Kontaktdan ma'lumot to'ldirildi", "success");
    } catch {
      hapticError();
      showToast("Kontaktlarni ochib bo'lmadi", "error");
    }
  }

  function handleCustomerSheetDismiss() {
    setIsAddCustomerSheetOpen(false);
    void KeyboardController.dismiss();
    resetCustomerForm();
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
        onPress={() => {
          hapticTap();
          openSheet("transaction", {
            customerId: item.customer.id,
            type: "debt",
            customerName: item.customer.fullName,
            customerPhone: item.customer.phone,
            currentBalance: item.balance,
            onOpenProfile: () =>
              navigation.navigate("CustomerDetail", {
                customerId: item.customer.id,
              }),
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
              {/* <Text style={styles.screenSubtitle}>
                Qarz va to'lovlarni boshqaring
              </Text> */}
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
              onChangeText={handleSearchChange}
              placeholder="Ism, telefon yoki mijoz ID"
            />
          </View>
          <View style={styles.searchMeta}>
            <Text style={styles.customerCount}>{customerCountLabel}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Faqat qarzdor mijozlarni ko'rsatish"
              accessibilityState={{ selected: debtorOnly }}
              activeOpacity={0.76}
              onPress={() => {
                hapticTap();
                setDebtorOnly((value) => !value);
              }}
              style={[
                styles.debtorFilter,
                debtorOnly && styles.debtorFilterActive,
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={15}
                color={debtorOnly ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.debtorFilterLabel,
                  debtorOnly && styles.debtorFilterLabelActive,
                ]}
              >
                Qarzdorlar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={isListLoading && listData.length === 0 ? [] : listData}
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
            listError && listData.length === 0 ? (
              <EmptyState
                iconName="cloud-offline-outline"
                title="Ma'lumotni yuklab bo'lmadi"
                description={getApiErrorMessage(
                  listError,
                  "Internetni tekshiring va qayta urinib ko'ring",
                )}
                action={
                  <PrimaryButton
                    label="Qayta urinish"
                    onPress={() => {
                      const refresh = isSearchActive
                        ? refetchSearch
                        : refreshCustomers;
                      void refresh().catch((error) =>
                        showToast(
                          getApiErrorMessage(error, "Qayta yuklashda xatolik"),
                          "error",
                        ),
                      );
                    }}
                  />
                }
              />
            ) : isListLoading && listData.length === 0 ? (
              <>
                <CustomerCardSkeleton />
                <CustomerCardSkeleton />
                <CustomerCardSkeleton />
              </>
            ) : (
              <EmptyState
                iconName="people-outline"
                title={
                  isSearchActive
                    ? "Topilmadi"
                    : debtorOnly
                      ? "Qarzdor mijoz yo'q"
                      : "Hali mijoz yo'q"
                }
                description={
                  isSearchActive
                    ? `"${debouncedQuery}" bo'yicha natija topilmadi`
                    : debtorOnly
                      ? "Hozir barcha mijozlarning qarzi yopilgan"
                      : "Boshlash uchun avval mijoz qo'shing"
                }
                action={
                  !isSearchActive && !debtorOnly ? (
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
              refreshing={isListLoading}
              onRefresh={() => {
                const refresh = isSearchActive
                  ? refetchSearch
                  : refreshCustomers;
                void refresh().catch((error) =>
                  showToast(
                    getApiErrorMessage(error, "Yangilashda xatolik"),
                    "error",
                  ),
                );
              }}
              tintColor={theme.primary}
            />
          }
        />
      </View>
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        enableDynamicSizing
        maxDynamicContentSize={Math.max(1, windowHeight - insets.top - 24)}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        enableBlurKeyboardOnGesture
        enableContentPanningGesture={false}
        topInset={insets.top}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        enableOverDrag={false}
        animationConfigs={SHEET_SPRING}
        onChange={(index) => setIsAddCustomerSheetOpen(index >= 0)}
        onDismiss={handleCustomerSheetDismiss}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetScrollView
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: Math.max(insets.bottom, 0) },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AndroidSheetKeyboardBridge />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Mijoz qo'shish</Text>
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

          <View style={styles.sheetFields}>
            <AppInput
              variant="sheet"
              compact
              label="Ism"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Mijoz ismini kiriting"
              editable={!isCreatingCustomer}
              autoCapitalize="words"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
            />
            <AppInput
              variant="sheet"
              compact
              inputRef={phoneInputRef}
              key={phoneInputKey}
              label="Telefon *"
              uncontrolled
              defaultValue={phone}
              transformText={formatUzPhoneFromDigits}
              onChangeText={handleAddPhoneChange}
              placeholder="+998 XX XXX XX XX"
              editable={!isCreatingCustomer}
              autoComplete="tel"
              keyboardType="phone-pad"
              returnKeyType="none"
              onSubmitEditing={handleAddPhoneSubmit}
              error={errors.phone}
              trailingAccessory={
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Kontaktdan tanlash"
                  accessibilityHint="Mijoz ismi va telefonini kontaktlardan to'ldirish"
                  disabled={isCreatingCustomer}
                  activeOpacity={0.7}
                  onPress={handlePickFromContacts}
                  style={styles.contactPickerButton}
                >
                  <Ionicons
                    name="people-outline"
                    size={23}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              }
            />
          </View>

          <PrimaryButton
            label="Mijoz qo'shish"
            onPress={handleCreateCustomer}
            loading={isCreatingCustomer}
            disabled={!isValidUzPhone(phone)}
            style={styles.sheetSaveButton}
          />
        </BottomSheetScrollView>
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
      paddingBottom: 5,
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
    searchMeta: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginTop: -8,
    },
    customerCount: {
      flex: 1,
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: "600",
    },
    debtorFilter: {
      minHeight: 30,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    debtorFilterActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    debtorFilterLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700",
    },
    debtorFilterLabelActive: {
      color: theme.primary,
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 5,
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
      paddingTop: 0,
      gap: 18,
      backgroundColor: theme.surface,
    },
    sheetHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
    },
    sheetTitle: {
      flex: 1,
      color: theme.text,
      fontSize: 19,
      lineHeight: 25,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    sheetCloseButton: {
      width: 44,
      height: 44,
      marginRight: -8,
      alignItems: "center",
      justifyContent: "center",
    },
    contactPickerButton: {
      width: 44,
      height: 44,
      marginRight: -8,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetFields: {
      gap: 16,
    },
    sheetSaveButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor: theme.primary,
      boxShadow: theme.cardShadow,
    },
  });
