import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Linking,
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
import * as Contacts from "expo-contacts";

import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { SearchBar } from "../components/SearchBar";
import { CustomerCard } from "../components/CustomerCard";
import { CustomerCardSkeleton } from "../components/CustomerCardSkeleton";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { AppInput } from "../components/AppInput";
import { getFullName, getBalance, getCustomerRisk } from "../utils";
import { hapticError, hapticSuccess, hapticTap } from "../utils/haptics";
import { spacing, radius, typography } from "../theme";
import { RootStackParamList } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function CustomersScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const { customers, transactions, addCustomer } = useApp();
  const { showToast } = useToast();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["70%"], []);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    phone?: string;
  }>({});

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 550);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        getFullName(c).toLowerCase().includes(q) ||
        c.phone.includes(q),
    );
  }, [customers, query]);

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

  function normalizePhone(value: string): string {
    const cleaned = value.replace(/[^\d+]/g, "");
    return cleaned.startsWith("+")
      ? `+${cleaned.slice(1).replace(/\+/g, "")}`
      : cleaned.replace(/\+/g, "");
  }

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
    bottomSheetRef.current?.dismiss();
  }

  function validateForm(): boolean {
    const e: { firstName?: string; lastName?: string; phone?: string } = {};
    const cleanedPhone = normalizePhone(phone);

    if (!firstName.trim()) e.firstName = "Ismni kiriting";
    if (!lastName.trim()) e.lastName = "Familiyani kiriting";
    if (!cleanedPhone.trim()) e.phone = "Telefon raqami majburiy";
    else if (!/^\+?\d{7,15}$/.test(cleanedPhone))
      e.phone = "Telefon raqami noto'g'ri (+998901234567)";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCreateCustomer() {
    if (!validateForm()) {
      hapticError();
      showToast("Formani tekshiring", "error");
      return;
    }

    const customer = addCustomer({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizePhone(phone),
      note: "",
    });

    setFirstName("");
    setLastName("");
    setPhone("");
    setErrors({});
    closeAddCustomerSheet();
    hapticSuccess();
    showToast("Mijoz qo'shildi", "success");
    navigation.navigate("CustomerDetail", { customerId: customer.id });
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
      setPhone(normalizePhone(phoneValue));
      showToast("Kontaktdan ma'lumot to'ldirildi", "success");
    } catch {
      hapticError();
      showToast("Kontaktlarni ochib bo'lmadi", "error");
    }
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={["top"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.border, backgroundColor: theme.surface },
        ]}
      >
        <View style={styles.headerTop}>
          <Text style={[typography.headingLarge, { color: theme.text }]}>
            Mijozlar
          </Text>
          <TouchableOpacity
            onPress={openAddCustomerSheet}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.searchWrap}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder="Ism, familiya yoki telefon..."
          />
        </View>
        <Text
          style={[
            typography.caption,
            { color: theme.textMuted, marginBottom: spacing.sm },
          ]}
        >
          {filtered.length} ta mijoz
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <>
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
              <CustomerCardSkeleton />
            </>
          ) : (
            <EmptyState
              iconName="people-outline"
              title={query ? "Topilmadi" : "Hali mijoz yo'q"}
              description={
                query
                  ? `"${query}" bo'yicha natija topilmadi`
                  : "Boshlash uchun avval mijoz qo'shing"
              }
              action={
                !query ? (
                  <PrimaryButton
                    label="Mijoz qo'shish"
                    onPress={openAddCustomerSheet}
                  />
                ) : undefined
              }
            />
          )
        }
        renderItem={({ item }) => (
          <CustomerCard
            customer={item}
            balance={getBalance(item.id, transactions)}
            risk={getCustomerRisk(item.id, transactions)}
            onPress={() =>
              navigation.navigate("CustomerDetail", { customerId: item.id })
            }
            onAddDebt={() => {
              hapticTap();
              navigation.navigate("AddTransaction", {
                customerId: item.id,
                type: "debt",
              });
            }}
            onAddPayment={() => {
              hapticTap();
              navigation.navigate("AddTransaction", {
                customerId: item.id,
                type: "payment",
              });
            }}
          />
        )}
      />
      <BottomSheetModal
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: theme.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.textMuted }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={[
              typography.headingMedium,
              { color: theme.text, marginBottom: spacing.xs },
            ]}
          >
            Yangi mijoz
          </Text>
          <Text
            style={[
              typography.bodySmall,
              { color: theme.textSecondary, marginBottom: spacing.md },
            ]}
          >
            Ism, familiya va telefon raqamini kiriting.
          </Text>

          <PrimaryButton
            label="Kontaktlardan qo'shish"
            onPress={handlePickFromContacts}
            variant="outline"
          />
          <View style={{ height: spacing.md }} />

          <AppInput
            label="Ism *"
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Masalan: Ali"
            iconName="person-outline"
            autoCapitalize="words"
            error={errors.firstName}
          />
          <AppInput
            label="Familiya *"
            value={lastName}
            onChangeText={setLastName}
            placeholder="Masalan: Valiyev"
            iconName="person-outline"
            autoCapitalize="words"
            error={errors.lastName}
          />
          <AppInput
            label="Telefon raqami *"
            value={phone}
            onChangeText={setPhone}
            placeholder="+998901234567"
            iconName="call-outline"
            keyboardType="phone-pad"
            error={errors.phone}
          />

          <View style={styles.sheetActions}>
            <PrimaryButton label="Saqlash" onPress={handleCreateCustomer} />
            <View style={{ height: spacing.sm }} />
            <PrimaryButton
              label="Bekor qilish"
              onPress={closeAddCustomerSheet}
              variant="outline"
            />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    marginBottom: spacing.sm,
  },
  list: {
    padding: spacing.md,
    flexGrow: 1,
  },
  sheetContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetActions: {
    marginTop: spacing.sm,
  },
});
