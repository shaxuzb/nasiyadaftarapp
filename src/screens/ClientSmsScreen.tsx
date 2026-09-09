import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SearchBar } from "../components/SearchBar";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAuth } from "../context/AuthContext";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { SmsRecipientRow } from "../modules/client-sms/components/SmsRecipientRow";
import {
  useSendBulkDebtSms,
  useSendDebtSms,
  useSmsRecipients,
  useSmsTemplate,
} from "../modules/client-sms/hooks/useClientSms";
import type {
  BulkSmsResponse,
  SmsRecipient,
  SmsRecipientFilters,
  SmsTemplate,
} from "../modules/client-sms/types";
import { getClientSmsCapabilities } from "../modules/client-sms/utils/smsPermissions";
import {
  selectEligibleRecipients,
  toggleRecipientSelection,
} from "../modules/client-sms/utils/recipientSelection";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getApiErrorMessage } from "../utils/apiError";
import { formatCurrency } from "../utils";
import { renderSmsTemplate } from "../modules/client-sms/utils/smsParsing";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const PAGE_SIZE = 20;
type BooleanFilter = "blacklisted" | "hasDebt" | "canSend";

function isBottomTabNavigation(navigation: Nav) {
  return (navigation.getState() as unknown as { type?: string }).type === "tab";
}

export function ClientSmsScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuth();
  const capabilities = getClientSmsCapabilities(user?.permissions);
  const isBottomTab = isBottomTabNavigation(navigation);
  if (!capabilities.canView) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header
          title="Mijozlarga SMS"
          onBack={isBottomTab ? undefined : () => navigation.goBack()}
        />
        <EmptyState
          iconName="lock-closed-outline"
          title="Ruxsat mavjud emas"
          description="SMS mijozlar ro'yxatini ko'rish uchun ruxsat kerak."
        />
      </SafeAreaView>
    );
  }
  return <ClientSmsContent capabilities={capabilities} />;
}

function ClientSmsContent({
  capabilities,
}: {
  capabilities: ReturnType<typeof getClientSmsCapabilities>;
}) {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { confirm } = useConfirmDialog();
  const { user, currentOrganization } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageNumber, setPageNumber] = useState(1);
  const [filters, setFilters] = useState<
    Partial<Record<BooleanFilter, boolean>>
  >({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSummary, setBulkSummary] = useState<BulkSmsResponse | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setPageNumber(1);
    setSelected(new Set());
    setBulkSummary(null);
  }, [debouncedSearch, filters]);
  useEffect(() => {
    setSelected(new Set());
  }, [pageNumber]);
  const queryFilters = useMemo<SmsRecipientFilters>(
    () => ({
      search: debouncedSearch || undefined,
      ...filters,
      pageNumber,
      pageSize: PAGE_SIZE,
    }),
    [debouncedSearch, filters, pageNumber],
  );
  const recipients = useSmsRecipients(queryFilters);
  const smsTemplate = useSmsTemplate();
  const sendOne = useSendDebtSms();
  const sendBulk = useSendBulkDebtSms();
  const rows = recipients.data?.results ?? [];
  const count = recipients.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const toggleFilter = (key: BooleanFilter) =>
    setFilters((current) => ({
      ...current,
      [key]: current[key] === true ? undefined : true,
    }));
  const toggle = useCallback(
    (id: number) =>
      setSelected((current) => toggleRecipientSelection(current, id)),
    [],
  );
  const getTemplateForConfirmation = useCallback(async () => {
    const template = smsTemplate.data ?? (await smsTemplate.refetch()).data;
    if (!template) throw new Error("SMS shabloni yuklanmadi");
    return template;
  }, [smsTemplate.data, smsTemplate.refetch]);
  const organizationName =
    currentOrganization?.name ?? user?.organizationName ?? "Tashkilot";
  const getPreviewMessage = useCallback(
    (template: SmsTemplate, recipient?: SmsRecipient) => {
      const values = recipient
        ? {
            organizationName,
            balance: formatCurrency(Math.abs(recipient.currentBalance)),
            fullName: recipient.fullName,
            phoneNumber: recipient.phone,
          }
        : {
            organizationName,
            balance: "{balance}",
            fullName: "{fullName}",
            phoneNumber: "{phoneNumber}",
          };
      return renderSmsTemplate(template.template, values);
    },
    [organizationName],
  );
  const sendToOne = useCallback(
    async (recipient: SmsRecipient) => {
      if (submitting.current || !capabilities.canSendOne || !recipient.canSend)
        return;
      submitting.current = true;
      try {
        const template = await getTemplateForConfirmation();
        const accepted = await confirm({
          title: "SMS yuborish",
          message: `${getPreviewMessage(template, recipient)}\n\n${recipient.fullName}ga yuborilsinmi?`,
          confirmText: "Yuborish",
          cancelText: "Bekor qilish",
        });
        if (!accepted) return;
        await sendOne.mutateAsync(recipient.id);
        showToast("SMS yuborish uchun qabul qilindi", "success");
      } catch (error) {
        showToast(getApiErrorMessage(error, "SMS yuborilmadi"), "error");
      } finally {
        submitting.current = false;
      }
    },
    [
      capabilities.canSendOne,
      confirm,
      getPreviewMessage,
      getTemplateForConfirmation,
      sendOne,
      showToast,
    ],
  );
  const submitBulk = async () => {
    if (submitting.current || !capabilities.canSendBulk || !selected.size)
      return;
    submitting.current = true;
    try {
      const template = await getTemplateForConfirmation();
      const accepted = await confirm({
        title: "SMS shablon",
        message: `${getPreviewMessage(template)}\n\n${selected.size} ta mijozga yuborilsinmi?`,
        confirmText: "Yuborish",
        cancelText: "Bekor qilish",
      });
      if (!accepted) return;
      const result = await sendBulk.mutateAsync([...selected]);
      setBulkSummary(result);
      showToast(
        `${result.sentCount} yuborildi · ${result.failedCount} xato · ${result.skippedCount} o'tkazildi`,
        result.failedCount ? "error" : "success",
      );
      setSelected(new Set());
    } catch (error) {
      showToast(getApiErrorMessage(error, "Ommaviy SMS yuborilmadi"), "error");
    } finally {
      submitting.current = false;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Header
          title="Mijozlarga SMS"
          onBack={
            isBottomTabNavigation(navigation)
              ? undefined
              : () => navigation.goBack()
          }
          action={
            capabilities.canViewHistory ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="SMS tarixi"
                onPress={() => navigation.navigate("ClientSmsHistory")}
                style={styles.headerAction}
              >
                <Ionicons name="time-outline" size={21} color={theme.primary} />
                <Text style={styles.headerActionText}>Tarix</Text>
              </Pressable>
            ) : null
          }
        />
        <View style={styles.search}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Ism yoki telefon bo'yicha qidirish"
          />
        </View>
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            keyboardShouldPersistTaps="handled"
          >
            {(
              [
                {
                  key: "blacklisted",
                  label: "Qora ro'yxat",
                  icon: "warning-outline",
                },
                { key: "hasDebt", label: "Qarzdor", icon: "wallet-outline" },
                {
                  key: "canSend",
                  label: "SMS mumkin",
                  icon: "checkmark-circle-outline",
                },
              ] as const
            ).map((item) => {
              const active = filters[item.key] === true;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => toggleFilter(item.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Ionicons
                    name={item.icon}
                    size={16}
                    color={active ? theme.primary : theme.textSecondary}
                  />
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{count} ta mijoz</Text>
          {capabilities.canSendBulk && rows.some((item) => item.canSend) ? (
            <Pressable
              onPress={() =>
                setSelected(
                  selected.size ? new Set() : selectEligibleRecipients(rows),
                )
              }
            >
              <Text style={styles.selectAll}>
                {selected.size ? "Bekor qilish" : "Sahifadagini tanlash"}
              </Text>
            </Pressable>
          ) : null}
        </View>
        {bulkSummary ? (
          <View style={styles.resultSummary}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={theme.primary}
            />
            <View style={styles.resultCopy}>
              <Text style={styles.resultTitle}>
                {bulkSummary.sentCount} yuborildi · {bulkSummary.failedCount}{" "}
                xato · {bulkSummary.skippedCount} o'tkazildi
              </Text>
              {bulkSummary.results.find((item) => item.errorMessage)
                ?.errorMessage ? (
                <Text style={styles.resultError} numberOfLines={2}>
                  {bulkSummary.results.find((item) => item.errorMessage)
                    ?.fullName ?? "Mijoz"}
                  :{" "}
                  {
                    bulkSummary.results.find((item) => item.errorMessage)
                      ?.errorMessage
                  }
                </Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Natijani yopish"
              hitSlop={8}
              onPress={() => setBulkSummary(null)}
            >
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
        ) : null}
        {recipients.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : recipients.isError ? (
          <EmptyState
            iconName="cloud-offline-outline"
            title="Ro'yxat yuklanmadi"
            description={getApiErrorMessage(
              recipients.error,
              "Internet aloqasini tekshiring",
            )}
            action={
              <PrimaryButton
                label="Qayta urinish"
                onPress={() => void recipients.refetch()}
              />
            }
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <SmsRecipientRow
                recipient={item}
                selected={selected.has(item.id)}
                selectable={capabilities.canSendBulk}
                canSendOne={capabilities.canSendOne}
                onToggle={toggle}
                onSend={(value) => void sendToOne(value)}
              />
            )}
            contentContainerStyle={[
              styles.list,
              !rows.length && styles.emptyList,
              {
                paddingBottom: selected.size
                  ? 92 + insets.bottom
                  : 20 + insets.bottom,
              },
            ]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <EmptyState
                iconName="chatbubble-ellipses-outline"
                title="Mijoz topilmadi"
                description="Qidiruv yoki filterlarni o'zgartirib ko'ring."
              />
            }
            refreshControl={
              <RefreshControl
                refreshing={recipients.isRefetching}
                onRefresh={() => void recipients.refetch()}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
        {count > PAGE_SIZE ? (
          <View
            style={[
              styles.pagination,
              {
                bottom: selected.size ? 76 + insets.bottom : insets.bottom + 4,
              },
            ]}
          >
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
              {pageNumber} / {pageCount}
            </Text>
            <Pressable
              disabled={pageNumber >= pageCount}
              onPress={() => setPageNumber((p) => p + 1)}
              style={styles.pageButton}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={
                  pageNumber >= pageCount ? theme.textMuted : theme.primary
                }
              />
            </Pressable>
          </View>
        ) : null}
        {capabilities.canSendBulk && selected.size ? (
          <View style={[styles.footer, { paddingBottom: 10 }]}>
            <View>
              <Text style={styles.footerCount}>
                {selected.size} ta tanlandi
              </Text>
              <Text style={styles.footerHint}>
                Faqat SMS mumkin bo'lgan mijozlar
              </Text>
            </View>
            <PrimaryButton
              label="SMS yuborish"
              loading={sendBulk.isPending}
              onPress={() => void submitBulk()}
              style={styles.footerButton}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Header({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.header}>
      {/* {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Orqaga qaytish"
          onPress={onBack}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
      ) : (
        <View style={styles.headerButton} />
      )} */}
      <Text style={styles.title}>{title}</Text>
      {action ?? <View style={styles.headerButton} />}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },
    header: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
    },
    headerButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    title: { flex: 1, ...typography.headingLarge, color: theme.text },
    headerAction: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 9,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    headerActionText: { ...typography.label, color: theme.primary },
    search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    filters: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
    },
    chip: {
      height: 36,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 11,
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
    summary: {
      minHeight: 16,
      paddingBottom: spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
    },
    summaryText: {
      ...typography.caption,
      color: theme.textMuted,
      fontWeight: "700",
    },
    selectAll: {
      ...typography.caption,
      color: theme.primary,
      fontWeight: "700",
    },
    resultSummary: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: 10,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    resultCopy: { flex: 1, minWidth: 0, gap: 2 },
    resultTitle: {
      ...typography.labelSmall,
      color: theme.text,
      fontWeight: "800",
    },
    resultError: { ...typography.caption, color: theme.dangerColor },
    list: { paddingHorizontal: spacing.md },
    separator: { height: spacing.sm },
    emptyList: { flexGrow: 1 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    pagination: {
      position: "absolute",
      alignSelf: "center",
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 4,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: radius.full,
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    pageButton: {
      width: 36,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    pageText: { ...typography.labelSmall, color: theme.textSecondary },
    footer: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      backgroundColor: theme.surface,
      boxShadow: theme.cardShadow,
    },
    footerCount: { ...typography.label, color: theme.text, fontWeight: "800" },
    footerHint: { ...typography.labelSmall, color: theme.textMuted },
    footerButton: { minHeight: 38, minWidth: 142, marginLeft: "auto" },
  });
