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
  Pressable,
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
import { useRegionalProductCapabilities } from "../hooks/useRegionalProductCapabilities";
import { SearchBar } from "../components/SearchBar";
import { CustomerCard } from "../modules/clients/components/CustomerCard";
import { CustomerCardSkeleton } from "../modules/clients/components/CustomerCardSkeleton";
import { isCustomerBlacklisted } from "../modules/clients/utils/blacklist";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppInput } from "../components/AppInput";
import { createBalanceMap } from "../modules/clients/utils/clientCalculations";
import {
  sortCustomerList,
  type CustomerListItem,
} from "../modules/clients/utils/clientList";
import { useClientSearch } from "../modules/clients/hooks/useClientSearch";
import { hapticError, hapticSuccess, hapticTap } from "../utils/haptics";
import { AppTheme, RootStackParamList } from "../types";
import { useBottomSheet, useBottomSheetBackHandler } from "../bottom-sheet";
import { AndroidSheetKeyboardBridge } from "../bottom-sheet/AndroidSheetKeyboardBridge";
import {
  formatUzPhoneFromDigits,
  isOptionalUzPhoneValid,
  toOptionalStoredUzPhone,
} from "../utils/masks";
import {
  getLocalizedApiErrorMessage,
  useTranslation,
  type TranslateKey,
} from "../i18n";
import { formatDateOnly, formatRelativeDateOnly } from "../i18n/calendarLabels";
import { formatAmountInput, parseAmountInput } from "../utils/amountInput";
import { todayDateOnly, type DateOnly } from "../utils/dateOnly";
import { radius, spacing } from "../theme";
import { PendingPaymentBanner } from "../modules/payments/components/PendingPaymentBanner";
import { useUnreadPushNotificationCount } from "../modules/push/hooks/usePushQueries";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Rendered between every row. Building the full themed stylesheet here would
// repeat that work once per gap, and the only value it needs is a fixed height.
const listStyles = StyleSheet.create({
  separator: { height: 12 },
});

function ListSeparator() {
  return <View style={listStyles.separator} />;
}

// Keeps the memo on CustomerCard effective: without this wrapper the inline
// onPress closure was rebuilt on every parent render (each keystroke in the
// search field), so every visible card re-rendered with it.
const CustomerRow = React.memo(function CustomerRow({
  item,
  onSelect,
}: {
  item: CustomerListItem;
  onSelect: (item: CustomerListItem) => void;
}) {
  const handlePress = useCallback(() => onSelect(item), [item, onSelect]);

  return (
    <CustomerCard
      customer={item.customer}
      balance={item.balance}
      onPress={handlePress}
    />
  );
});

const SHEET_SPRING = {
  damping: 80,
  stiffness: 500,
  mass: 0.8,
  overshootClamping: true,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2,
};

const EMPTY_BALANCE_MAP = new Map<number, number>();

type BalanceDirection = "debt" | "advance";

const BALANCE_DIRECTIONS: ReadonlyArray<{
  value: BalanceDirection;
  labelKey: TranslateKey;
}> = [
  { value: "debt", labelKey: "customers.balanceDebt" },
  { value: "advance", labelKey: "customers.balanceAdvance" },
];

export function CustomersScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const {
    customers,
    transactions,
    addCustomer,
    refreshCustomers,
    isLoadingCustomers,
    dataError,
  } = useApp();
  const { user } = useAuth();
  const regionalCapabilities = useRegionalProductCapabilities();
  const { showToast } = useToast();
  const { openSheet } = useBottomSheet();
  const unreadNotifications = useUnreadPushNotificationCount();
  const unreadNotificationCount = unreadNotifications.data ?? 0;
  const isAdministrator = user?.role === "Administrator" && user?.roleId === 2;
  const isPremium =
    user?.subscription?.planCode?.trim().toUpperCase() === "PREMIUM";
  const showProBadge =
    regionalCapabilities.subscriptionVisible && !isAdministrator && !isPremium;
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
  const [balanceDirection, setBalanceDirection] =
    useState<BalanceDirection>("debt");
  // null stands for "today", resolved when read. A concrete default would go
  // stale on a screen that stays mounted overnight.
  const [balanceDate, setBalanceDate] = useState<DateOnly | null>(null);
  const [balanceInputKey, setBalanceInputKey] = useState(0);
  // Nothing on screen depends on the amount while it is being typed, so it lives
  // in a ref: as state it would re-render this whole screen, list included, on
  // every keystroke. It is read once, on submit.
  const balanceAmountRef = useRef("");

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

  const handleBalanceAmountChange = useCallback((value: string) => {
    balanceAmountRef.current = value;
  }, []);

  const openBalanceDatePicker = useCallback(() => {
    // Opens on top of the add-customer sheet, which stays in place underneath
    // (the calendar is registered with stackBehavior "push").
    openSheet("datePicker", {
      value: balanceDate ?? todayDateOnly(),
      title: t("customers.initialBalanceDate"),
      onSelect: setBalanceDate,
    });
  }, [balanceDate, openSheet, t]);

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
    return sortCustomerList(
      filteredCustomers.map((customer) => ({
        customer,
        balance: customer.currentBalance ?? balanceMap.get(customer.id) ?? 0,
      })),
      debtorOnly,
    );
  }, [balanceMap, debtorOnly, filteredCustomers]);

  const customerCountLabel = useMemo(
    () =>
      debtorOnly
        ? t("customers.countDebtors", { count: listData.length })
        : debouncedQuery
          ? t("customers.countResults", {
              count: isSearchActive ? searchResult.count : customers.length,
            })
          : t("customers.countCustomers", { count: listData.length }),
    [
      customers.length,
      debouncedQuery,
      debtorOnly,
      isSearchActive,
      listData.length,
      searchResult.count,
      t,
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
    setBalanceDirection("debt");
    setBalanceDate(null);
    balanceAmountRef.current = "";
    setBalanceInputKey((key) => key + 1);
    setErrors({});
    setIsCreatingCustomer(false);
  }

  function validateForm(): boolean {
    const e: { phone?: string } = {};

    if (!isOptionalUzPhoneValid(phone)) e.phone = t("customers.phoneInvalid");

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreateCustomer() {
    if (isCreatingCustomer) return;
    if (!validateForm()) {
      hapticError();
      showToast(t("customers.formCheck"), "error");
      return;
    }

    void KeyboardController.dismiss();

    try {
      setIsCreatingCustomer(true);
      const balanceAmount = parseAmountInput(balanceAmountRef.current);
      await addCustomer({
        fullName: fullName.trim().replace(/\s+/g, " "),
        phone: toOptionalStoredUzPhone(phone),
        note: "",
        // An empty or zero amount sends neither field, and no date either: a
        // date with no balance behind it means nothing to the backend.
        ...(balanceAmount === null
          ? {}
          : {
              initialBalance:
                balanceDirection === "debt" ? balanceAmount : -balanceAmount,
              initialBalanceDate: balanceDate ?? todayDateOnly(),
            }),
      });

      resetCustomerForm();
      closeAddCustomerSheet();
      hapticSuccess();
      showToast(t("customers.added"), "success");
    } catch (error) {
      hapticError();
      showToast(
        getLocalizedApiErrorMessage(error, "customers.addError", t),
        "error",
      );
    } finally {
      setIsCreatingCustomer(false);
    }
  }

  async function handlePickFromContacts() {
    try {
      phoneInputRef.current?.blur();
      await KeyboardController.dismiss();
      const existingPermission = await Contacts.getPermissionsAsync();
      const permission =
        existingPermission.status === "granted"
          ? existingPermission
          : await Contacts.requestPermissionsAsync();

      if (permission.status !== "granted") {
        hapticError();
        if (permission.canAskAgain === false) {
          showToast(t("customers.contactsPermissionBlocked"), "error");
          Linking.openSettings();
        } else {
          showToast(t("customers.contactsPermissionDenied"), "error");
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
        showToast(t("customers.contactsMissing"), "error");
        return;
      }

      setFullName(contactFullName.replace(/\s+/g, " "));
      setPhone(formatUzPhoneFromDigits(phoneValue));
      setPhoneInputKey((key) => key + 1);
      setErrors({});
      showToast(t("customers.contactsFilled"), "success");
    } catch {
      hapticError();
      showToast(t("customers.contactsOpenError"), "error");
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

  const handleSelectCustomer = useCallback(
    (item: ListItem) => {
      hapticTap();
      openSheet("transaction", {
        customerId: item.customer.id,
        type: "debt",
        customerName: item.customer.fullName,
        customerPhone: item.customer.phone,
        isBlacklisted: isCustomerBlacklisted(item.customer),
        currentBalance: item.balance,
        onOpenProfile: () =>
          navigation.navigate("CustomerDetail", {
            customerId: item.customer.id,
          }),
      });
    },
    [navigation, openSheet],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => (
      <CustomerRow item={item} onSelect={handleSelectCustomer} />
    ),
    [handleSelectCustomer],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.mainKeyboardWrap}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.titleBlock}>
              <Text style={styles.screenTitle}>
                {t("customers.screenTitle")}
              </Text>
              {/* <Text style={styles.screenSubtitle}>
                Qarz va to'lovlarni boshqaring
              </Text> */}
            </View>
            <View style={styles.headerActions}>
              {showProBadge ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("subscription.openPlans")}
                  onPress={() => navigation.navigate("Subscription")}
                  activeOpacity={0.82}
                  style={styles.proButton}
                >
                  <Ionicons
                    name="diamond-outline"
                    size={16}
                    color={theme.primary}
                  />
                  <Text style={styles.proButtonText}>PRO</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("notifications.unreadA11y", {
                  count: unreadNotificationCount,
                })}
                onPress={() => navigation.navigate("Notifications")}
                activeOpacity={0.82}
                style={styles.notificationBtn}
              >
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={theme.text}
                />
                {unreadNotificationCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99
                        ? "99+"
                        : unreadNotificationCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={t("customers.addCustomer")}
                onPress={openAddCustomerSheet}
                activeOpacity={0.82}
                style={styles.addBtn}
              >
                <Ionicons name="add" size={26} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.searchWrap}>
            <SearchBar
              value={query}
              onChangeText={handleSearchChange}
              placeholder={t("customers.searchPlaceholder")}
            />
          </View>
          <View style={styles.searchMeta}>
            <Text style={styles.customerCount}>{customerCountLabel}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("customers.debtorFilterA11y")}
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
                {t("customers.debtorFilter")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <PendingPaymentBanner />

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
                title={t("customers.fetchErrorTitle")}
                description={getLocalizedApiErrorMessage(
                  listError,
                  "customers.fetchErrorDescription",
                  t,
                )}
                action={
                  <PrimaryButton
                    label={t("customers.retry")}
                    onPress={() => {
                      const refresh = isSearchActive
                        ? refetchSearch
                        : refreshCustomers;
                      void refresh().catch((error) =>
                        showToast(
                          getLocalizedApiErrorMessage(
                            error,
                            "customers.retryLoadError",
                            t,
                          ),
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
                    ? t("customers.emptySearchTitle")
                    : debtorOnly
                      ? t("customers.emptyDebtorsTitle")
                      : t("customers.emptyTitle")
                }
                description={
                  isSearchActive
                    ? t("customers.emptySearchDescription", {
                        query: debouncedQuery,
                      })
                    : debtorOnly
                      ? t("customers.emptyDebtorsDescription")
                      : t("customers.emptyDescription")
                }
                action={
                  !isSearchActive && !debtorOnly ? (
                    <PrimaryButton
                      label={t("customers.addAction")}
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
                    getLocalizedApiErrorMessage(
                      error,
                      "customers.retryLoadError",
                      t,
                    ),
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
            <Text style={styles.sheetTitle}>{t("customers.sheetTitle")}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t("customers.close")}
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
              label={t("customers.name")}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t("customers.namePlaceholder")}
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
              inputResetKey={phoneInputKey}
              label={t("customers.phoneOptional")}
              uncontrolled
              defaultValue={phone}
              transformText={formatUzPhoneFromDigits}
              onChangeText={handleAddPhoneChange}
              placeholder={t("customers.phonePlaceholder")}
              editable={!isCreatingCustomer}
              autoComplete="tel"
              keyboardType="phone-pad"
              returnKeyType="none"
              onSubmitEditing={handleAddPhoneSubmit}
              error={errors.phone}
              trailingAccessory={
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={t("customers.contactPicker")}
                  accessibilityHint={t("customers.contactPickerHint")}
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

            <View>
              <View style={styles.balanceLabelRow}>
                <Text style={styles.balanceLabel} numberOfLines={1}>
                  {t("customers.initialBalanceLabel")}
                </Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t("customers.balanceDirection")}
                  style={styles.directionToggle}
                >
                  {BALANCE_DIRECTIONS.map((option) => {
                    const selected = option.value === balanceDirection;
                    const isDebt = option.value === "debt";
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{
                          selected,
                          disabled: isCreatingCustomer,
                        }}
                        disabled={isCreatingCustomer}
                        onPress={() => setBalanceDirection(option.value)}
                        style={[
                          styles.directionOption,
                          selected && {
                            backgroundColor: isDebt
                              ? theme.debtBg
                              : theme.paymentBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.directionText,
                            selected && {
                              color: isDebt
                                ? theme.debtColor
                                : theme.paymentColor,
                            },
                          ]}
                        >
                          {t(option.labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <AppInput
                variant="sheet"
                compact
                inputResetKey={balanceInputKey}
                uncontrolled
                defaultValue=""
                transformText={formatAmountInput}
                onChangeText={handleBalanceAmountChange}
                placeholder={t("customers.initialBalancePlaceholder")}
                editable={!isCreatingCustomer}
                keyboardType="number-pad"
                returnKeyType="none"
                onSubmitEditing={handleAddPhoneSubmit}
                trailingAccessory={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("customers.initialBalanceDateA11y", {
                      date: formatDateOnly(balanceDate ?? todayDateOnly(), t),
                    })}
                    disabled={isCreatingCustomer}
                    hitSlop={6}
                    onPress={openBalanceDatePicker}
                    style={({ pressed }) => [
                      styles.dateChip,
                      pressed && styles.dateChipPressed,
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={15}
                      color={theme.primary}
                    />
                    <Text style={styles.dateChipText} numberOfLines={1}>
                      {formatRelativeDateOnly(
                        balanceDate ?? todayDateOnly(),
                        todayDateOnly(),
                        t,
                      )}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={13}
                      color={theme.primary}
                    />
                  </Pressable>
                }
              />
            </View>
          </View>

          <PrimaryButton
            label={t("customers.addAction")}
            onPress={handleCreateCustomer}
            loading={isCreatingCustomer}
            disabled={!isOptionalUzPhoneValid(phone)}
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
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    proButton: {
      minWidth: 58,
      height: 36,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      paddingHorizontal: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: `${theme.primary}55`,
      backgroundColor: theme.primaryLight,
    },
    proButtonText: {
      color: theme.primary,
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "900",
      letterSpacing: 0.4,
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
    notificationBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    notificationBadge: {
      position: "absolute",
      top: -3,
      right: -3,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      backgroundColor: theme.dangerColor,
      borderWidth: 2,
      borderColor: theme.background,
    },
    notificationBadgeText: {
      color: "#FFFFFF",
      fontSize: 9,
      lineHeight: 11,
      fontWeight: "800",
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
    balanceLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    // Matches AppInput's sheet label, which this row replaces so the toggle can
    // share its line instead of adding one of its own.
    balanceLabel: {
      flexShrink: 1,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700",
      letterSpacing: 0.2,
      color: theme.textSecondary,
    },
    directionToggle: {
      flexDirection: "row",
      padding: 2,
      borderRadius: radius.full,
      backgroundColor: theme.inputBackground,
    },
    directionOption: {
      minHeight: 26,
      justifyContent: "center",
      paddingHorizontal: 12,
      borderRadius: radius.full,
    },
    directionText: {
      fontSize: 12,
      fontWeight: "700",
      color: theme.textSecondary,
    },
    dateChip: {
      maxWidth: 150,
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      marginRight: -6,
      paddingHorizontal: 10,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    dateChipPressed: { opacity: 0.72 },
    dateChipText: {
      flexShrink: 1,
      fontSize: 12,
      fontWeight: "700",
      color: theme.primary,
    },
    sheetSaveButton: {
      minHeight: 50,
      borderRadius: 13,
      backgroundColor: theme.primary,
      boxShadow: theme.cardShadow,
    },
  });
