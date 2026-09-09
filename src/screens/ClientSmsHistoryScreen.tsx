import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchBar } from "../components/SearchBar";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../hooks/useTheme";
import { SmsHistoryRow } from "../modules/client-sms/components/SmsHistoryRow";
import { useSmsHistory } from "../modules/client-sms/hooks/useClientSms";
import type { SmsHistoryFilters } from "../modules/client-sms/types";
import { getClientSmsCapabilities } from "../modules/client-sms/utils/smsPermissions";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getApiErrorMessage } from "../utils/apiError";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const PAGE_SIZE = 20;
const statuses = [
  { label: "Hammasi", value: undefined },
  { label: "Yuborildi", value: "sent" },
  { label: "Xato", value: "failed" },
  { label: "O'tkazildi", value: "skipped" },
] as const;

export function ClientSmsHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const capabilities = getClientSmsCapabilities(user?.permissions);
  if (!capabilities.canViewHistory)
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <EmptyState
          iconName="lock-closed-outline"
          title="Ruxsat mavjud emas"
          description="SMS tarixini ko'rish uchun ruxsat kerak."
        />
      </SafeAreaView>
    );
  return <HistoryContent />;
}

function HistoryContent() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState<string>();
  const [pageNumber, setPageNumber] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => setPageNumber(1), [debounced, status]);
  const filters = useMemo<SmsHistoryFilters>(
    () => ({
      search: debounced || undefined,
      status,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [debounced, status, pageNumber],
  );
  const history = useSmsHistory(filters);
  const count = history.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <Header onBack={() => navigation.goBack()} />
      <View style={styles.search}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Mijoz yoki telefon bo'yicha qidirish"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {statuses.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityState={{ selected: status === item.value }}
            onPress={() => setStatus(item.value)}
            style={[styles.chip, status === item.value && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                status === item.value && styles.chipTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.count}>{count} ta SMS yozuvi</Text>
      {history.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : history.isError ? (
        <EmptyState
          iconName="cloud-offline-outline"
          title="SMS tarixi yuklanmadi"
          description={getApiErrorMessage(
            history.error,
            "Internet aloqasini tekshiring",
          )}
          action={
            <PrimaryButton
              label="Qayta urinish"
              onPress={() => void history.refetch()}
            />
          }
        />
      ) : (
        <FlatList
          data={history.data?.results ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SmsHistoryRow item={item} />}
          contentContainerStyle={[
            styles.list,
            !history.data?.results.length && styles.empty,
          ]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              iconName="time-outline"
              title="SMS tarixi bo'sh"
              description="Yuborilgan SMS'lar shu yerda ko'rinadi."
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={history.isRefetching}
              onRefresh={() => void history.refetch()}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
      {count > PAGE_SIZE ? (
        <View style={styles.pagination}>
          <Pressable
            disabled={pageNumber <= 1}
            onPress={() => setPageNumber((p) => p - 1)}
            style={styles.pageButton}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={pageNumber <= 1 ? theme.textMuted : theme.primary}
            />
          </Pressable>
          <Text style={styles.pageText}>
            {pageNumber} / {pages}
          </Text>
          <Pressable
            disabled={pageNumber >= pages}
            onPress={() => setPageNumber((p) => p + 1)}
            style={styles.pageButton}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={pageNumber >= pages ? theme.textMuted : theme.primary}
            />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
function Header({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Orqaga qaytish"
        onPress={onBack}
        style={styles.headerButton}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      <Text style={styles.title}>SMS tarixi</Text>
      <View style={styles.headerButton} />
    </View>
  );
}
const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      textAlign: "center",
      ...typography.headingLarge,
      color: theme.text,
    },
    search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    filters: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    chip: {
      height: 36,
      justifyContent: "center",
      paddingHorizontal: 13,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.full,
      backgroundColor: theme.surface,
    },
    chipActive: {
      borderColor: theme.primary,
      backgroundColor: theme.primaryLight,
    },
    chipText: { ...typography.labelSmall, color: theme.textSecondary },
    chipTextActive: { color: theme.primary },
    count: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    list: { paddingHorizontal: spacing.md, paddingBottom: 72 },
    empty: { flexGrow: 1 },
    pagination: {
      position: "absolute",
      bottom: 10,
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.full,
      backgroundColor: theme.surface,
    },
    pageButton: {
      width: 36,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    pageText: { ...typography.labelSmall, color: theme.textSecondary },
  });
