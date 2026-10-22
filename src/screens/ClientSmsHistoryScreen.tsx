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
import { useSmsHistory, useSmsQueue, useCancelQueuedSms } from "../modules/client-sms/hooks/useClientSms";
import type { SmsHistoryFilters } from "../modules/client-sms/types";
import { getClientSmsCapabilities } from "../modules/client-sms/utils/smsPermissions";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getLocalizedApiErrorMessage, useTranslation } from "../i18n";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const PAGE_SIZE = 20;
const statuses = [
  { labelKey: "sms.statusAll", value: undefined },
  { labelKey: "sms.statusSent", value: "sent" },
  { labelKey: "sms.statusPending", value: "pending" },
  { labelKey: "sms.statusFailed", value: "failed" },
  { labelKey: "sms.statusSkipped", value: "skipped" },
  { labelKey: "sms.statusQueued", value: "queued" },
  { labelKey: "sms.statusCancelled", value: "cancelled" },
] as const;

// Defined at module scope so the list keeps one separator component type.
// An inline arrow here produced a new type on every render, which unmounted
// and remounted every separator in the list.
const historyListStyles = StyleSheet.create({
  separator: { height: spacing.sm },
});

function HistorySeparator() {
  return <View style={historyListStyles.separator} />;
}

export function ClientSmsHistoryScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const capabilities = getClientSmsCapabilities(user?.permissions);
  if (!capabilities.canViewHistory)
    return (
      <SafeAreaView style={styles.safe}>
        <Header onBack={() => navigation.goBack()} />
        <EmptyState
          iconName="lock-closed-outline"
          title={t("sms.historyPermissionTitle")}
          description={t("sms.historyPermissionDescription")}
        />
      </SafeAreaView>
    );
  return <HistoryContent />;
}

function HistoryContent() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const [tab, setTab] = useState<"history" | "queue">("history");
  const queue = useSmsQueue();
  const cancel = useCancelQueuedSms();
  const { confirm } = useConfirmDialog();
  const { showToast } = useToast();
  const cancelQueued = async (id: number) => {
    if (id <= 0 || cancel.isPending) return;
    if (!(await confirm({ title: t("sms.cancelQueuedTitle"), message: t("sms.cancelQueuedDescription"), confirmText: t("sms.cancelQueuedAction"), cancelText: t("common.cancel") }))) return;
    try { await cancel.mutateAsync(id); showToast(t("sms.cancelQueuedSuccess"), "success"); }
    catch (error) { showToast(getLocalizedApiErrorMessage(error, "sms.cancelQueuedError", t), "error"); }
  };
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
      <View style={styles.queueTabs}>
        {(["history", "queue"] as const).map((value) => (
          <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={[styles.queueTab, { borderColor: theme.border, backgroundColor: tab === value ? theme.primaryLight : theme.surface }]}>
            <Text style={{ color: tab === value ? theme.primary : theme.textSecondary, fontWeight: "700" }}>
              {value === "history" ? t("sms.historyAction") : t("sms.queueTab")}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "queue" ? <View style={{ flex: 1 }}>
        {queue.isPending ? <View style={styles.center}><ActivityIndicator color={theme.primary} /></View> :
          queue.isError ? <EmptyState iconName="cloud-offline-outline" title={t("sms.queueLoadError")}
            description={getLocalizedApiErrorMessage(queue.error, "sms.queueLoadError", t)}
            action={<PrimaryButton label={t("customers.retry")} onPress={() => void queue.refetch()} />} /> :
          <>
            <Text style={styles.count}>{t("sms.queueCount", { count: queue.data?.queuedCount ?? 0 })}</Text>
            <FlatList data={queue.data?.items ?? []} keyExtractor={(item, index) => `${item.id}-${index}`}
              renderItem={({ item }) => <View style={{ gap: 8 }}>
                <SmsHistoryRow item={item} />
                {item.id > 0 ? <Pressable accessibilityRole="button" disabled={cancel.isPending}
                  onPress={() => void cancelQueued(item.id)}
                  style={[styles.cancelButton, { borderColor: theme.border, opacity: cancel.isPending ? 0.5 : 1 }]}>
                  <Text style={{ color: theme.dangerColor, fontWeight: "700" }}>{t("sms.cancelQueuedAction")}</Text>
                </Pressable> : null}
              </View>}
              ItemSeparatorComponent={HistorySeparator}
              contentContainerStyle={[styles.list, !(queue.data?.items.length) && styles.empty]}
              ListEmptyComponent={<EmptyState iconName="time-outline" title={t("sms.queueEmpty")} description={t("sms.queueEmptyDescription")} />}
              refreshControl={<RefreshControl refreshing={queue.isRefetching} onRefresh={() => void queue.refetch()} tintColor={theme.primary} />}
              initialNumToRender={10} maxToRenderPerBatch={8} windowSize={5} />
          </>}
      </View> : <>
      <View style={styles.search}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t("sms.historySearchPlaceholder")}
        />
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {statuses.map((item) => (
            <Pressable
              key={item.labelKey}
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
                {t(item.labelKey)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <Text style={styles.count}>{t("sms.historyCount", { count })}</Text>
      {history.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : history.isError ? (
        <EmptyState
          iconName="cloud-offline-outline"
          title={t("sms.historyLoadError")}
          description={getLocalizedApiErrorMessage(
            history.error,
            "customers.fetchErrorDescription",
            t,
          )}
          action={
            <PrimaryButton
              label={t("customers.retry")}
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
          ItemSeparatorComponent={HistorySeparator}
          initialNumToRender={10}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          ListEmptyComponent={
            <EmptyState
              iconName="time-outline"
              title={t("sms.historyEmpty")}
              description={t("sms.historyEmptyDescription")}
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
      </>}
    </SafeAreaView>
  );
}
function Header({ onBack }: { onBack: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("common.back")}
        onPress={onBack}
        style={styles.headerButton}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      <Text style={styles.title}>{t("sms.historyTitle")}</Text>
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
    queueTabs: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
    queueTab: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: radius.md, borderWidth: 1 },
    cancelButton: { minHeight: 36, justifyContent: "center", alignItems: "center", borderRadius: radius.md, borderWidth: 1 },
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
