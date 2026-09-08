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
  ScrollViewProps,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import {
  KeyboardAwareScrollView,
  KeyboardController,
} from "react-native-keyboard-controller";
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

const EMPTY_BALANCE_MAP = new Map<number, number>();

export function CustomersScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
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
  const snapPoints = useMemo(() => ["78%"], []);
  const [isAddCustomerSheetOpen, setIsAddCustomerSheetOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debtorOnly, setDebtorOnly] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("+998 ");
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

  useBottomSheetBackHandler(
    isAddCustomerSheetOpen,
    closeAddCustomerSheet,
  );

  function resetCustomerForm() {
    setFullName("");
    setPhone("+998 ");
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
    if (!validateForm()) {
      hapticError();
      showToast("Formani tekshiring", "error");
      return;
    }

    void KeyboardController.dismiss();

    try {
      setIsCreatingCustomer(true);
      const customer = await addCustomer({
        fullName: fullName.trim().replace(/\s+/g, " "),
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
      showToast(getApiErrorMessage(error, "Mijoz qo'shishda xatolik"), "error");
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
            customerName: item.customer.fullName,
            currentBalance: item.balance,
          });
        }}
        onAddPayment={() => {
          hapticTap();
          openSheet("transaction", {
            customerId: item.customer.id,
            type: "payment",
            customerName: item.customer.fullName,
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
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustPan"
        enableBlurKeyboardOnGesture
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
        <View style={styles.sheetKeyboardWrap}>
          <KeyboardAwareScrollView
            ScrollViewComponent={KeyboardBottomSheetScrollView}
            style={styles.sheetKeyboardScroll}
            bottomOffset={72}
            extraKeyboardSpace={16}
            disableScrollOnKeyboardHide={false}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
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
                  Mavjud ism va telefon avtomatik to'ldiriladi
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
                label="To'liq ism"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Masalan: Ali Valiyev"
                iconName="person-outline"
                autoCapitalize="words"
                returnKeyType="next"
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
              <Text style={styles.requiredHint}>* Telefon raqami majburiy</Text>
              <PrimaryButton
                label="Mijozni saqlash"
                onPress={handleCreateCustomer}
                loading={isCreatingCustomer}
                style={styles.sheetSaveButton}
              />
            </View>
          </KeyboardAwareScrollView>
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
