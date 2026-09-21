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
import { CustomerEditSheet } from "../modules/clients/components/CustomerEditSheet";
import { useClientDetail } from "../modules/clients/hooks/useClientDetail";
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
  isSmsRecipientSelectable,
  selectEligibleRecipients,
  toggleRecipientSelection,
} from "../modules/client-sms/utils/recipientSelection";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import type { Customer } from "../modules/clients/types";
import {
  formatLocalizedCurrency,
  getLocalizedApiErrorMessage,
  useTranslation,
} from "../i18n";
import { renderSmsTemplate } from "../modules/client-sms/utils/smsParsing";
import { SubscriptionUpgradeModal } from "../modules/subscription/components/SubscriptionUpgradeModal";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type BooleanFilter = "blacklisted" | "hasDebt" | "canSend";

function isBottomTabNavigation(navigation: Nav) {
  return (navigation.getState() as unknown as { type?: string }).type === "tab";
}

export function ClientSmsScreen() {
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const { user } = useAuth();
  const capabilities = getClientSmsCapabilities(
    user?.permissions,
    user?.subscription,
  );
  const isBottomTab = isBottomTabNavigation(navigation);
  if (!capabilities.canView) {
    return (
      <SafeAreaView style={styles.safe}>
        <Header
          title={t("sms.screenTitle")}
          onBack={isBottomTab ? undefined : () => navigation.goBack()}
        />
        <EmptyState
          iconName="lock-closed-outline"
          title={t("sms.permissionTitle")}
          description={t("sms.permissionDescription")}
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
  const { locale, t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { confirm } = useConfirmDialog();
  const { user, currentOrganization } = useAuth();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<
    Partial<Record<BooleanFilter, boolean>>
  >({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSummary, setBulkSummary] = useState<BulkSmsResponse | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [phoneEditorRecipient, setPhoneEditorRecipient] =
    useState<SmsRecipient | null>(null);
  const submitting = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setSelected(new Set());
    setBulkSummary(null);
  }, [debouncedSearch, filters]);
  const queryFilters = useMemo<SmsRecipientFilters>(
    () => ({
      search: debouncedSearch || undefined,
      ...filters,
    }),
    [debouncedSearch, filters],
  );
  const recipients = useSmsRecipients(queryFilters);
  const smsTemplate = useSmsTemplate();
  const sendOne = useSendDebtSms();
  const sendBulk = useSendBulkDebtSms();
  const rows = recipients.data?.results ?? [];
  const count = recipients.data?.count ?? 0;
  const hasSelectableRecipients = useMemo(
    () => rows.some(isSmsRecipientSelectable),
    [rows],
  );
  const smsQuota = user?.subscription?.sms;
  const smsLimitReached = smsQuota?.totalRemaining === 0;
  const blacklistAvailable = user?.subscription?.blacklistEnabled !== false;

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
  const keyExtractor = useCallback((item: SmsRecipient) => String(item.id), []);
  const getTemplateForConfirmation = useCallback(async () => {
    const template = smsTemplate.data ?? (await smsTemplate.refetch()).data;
    if (!template) throw new Error(t("sms.templateLoadError"));
    return template;
  }, [smsTemplate.data, smsTemplate.refetch, t]);
  const organizationName =
    currentOrganization?.name ?? user?.organizationName ?? t("sms.organizationFallback");
  const getPreviewMessage = useCallback(
    (template: SmsTemplate, recipient?: SmsRecipient) => {
      const values = recipient
        ? {
            organizationName,
            balance: formatLocalizedCurrency(
              Math.abs(recipient.currentBalance),
              locale,
            ),
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
    [locale, organizationName],
  );
  const sendToOne = useCallback(
    async (recipient: SmsRecipient) => {
      if (smsLimitReached) {
        setIsUpgradeModalOpen(true);
        return;
      }
      if (
        submitting.current ||
        !capabilities.canSendOne ||
        !isSmsRecipientSelectable(recipient)
      )
        return;
      submitting.current = true;
      try {
        const template = await getTemplateForConfirmation();
        const accepted = await confirm({
          title: t("sms.sendTitle"),
          message: `${getPreviewMessage(template, recipient)}\n\n${t("sms.recipientConfirmation", { name: recipient.fullName })}`,
          confirmText: t("sms.sendAction"),
          cancelText: t("common.cancel"),
        });
        if (!accepted) return;
        await sendOne.mutateAsync(recipient.id);
        showToast(t("sms.sendAccepted"), "success");
      } catch (error) {
        showToast(getLocalizedApiErrorMessage(error, "sms.sendError", t), "error");
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
      smsLimitReached,
      t,
      locale,
    ],
  );
  const submitBulk = async () => {
    if (smsLimitReached) {
      setIsUpgradeModalOpen(true);
      return;
    }
    if (submitting.current || !capabilities.canSendBulk || !selected.size)
      return;
    submitting.current = true;
    try {
      const template = await getTemplateForConfirmation();
      const accepted = await confirm({
        title: t("sms.templateTitle"),
        message: `${getPreviewMessage(template)}\n\n${t("sms.bulkConfirmation", { count: selected.size })}`,
        confirmText: t("sms.sendAction"),
        cancelText: t("common.cancel"),
      });
      if (!accepted) return;
      const result = await sendBulk.mutateAsync([...selected]);
      setBulkSummary(result);
      showToast(
        t("sms.sentSummary", {
          sent: result.sentCount,
          failed: result.failedCount,
          skipped: result.skippedCount,
        }),
        result.failedCount ? "error" : "success",
      );
      setSelected(new Set());
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "sms.bulkSendError", t), "error");
    } finally {
      submitting.current = false;
    }
  };
  const renderRecipient = useCallback(
    ({ item }: { item: SmsRecipient }) => (
      <SmsRecipientRow
        recipient={item}
        selected={selected.has(item.id)}
        selectable={capabilities.canSendBulk}
        canSendOne={capabilities.canSendOne}
        onToggle={toggle}
        onSend={(value) => void sendToOne(value)}
        onAddPhone={setPhoneEditorRecipient}
        onQuotaReached={
          smsLimitReached
            ? () => setIsUpgradeModalOpen(true)
            : undefined
        }
      />
    ),
    [
      capabilities.canSendBulk,
      capabilities.canSendOne,
      selected,
      sendToOne,
      smsLimitReached,
      toggle,
    ],
  );
  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [styles.separator],
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Header
          title={t("sms.screenTitle")}
          onBack={
            isBottomTabNavigation(navigation)
              ? undefined
              : () => navigation.goBack()
          }
          action={
            capabilities.canViewHistory ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("sms.history")}
                onPress={() => navigation.navigate("ClientSmsHistory")}
                style={styles.headerAction}
              >
                <Ionicons name="time-outline" size={21} color={theme.primary} />
                <Text style={styles.headerActionText}>{t("sms.historyAction")}</Text>
              </Pressable>
            ) : null
          }
        />
        <View style={styles.search}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder={t("sms.searchPlaceholder")}
          />
        </View>
        {smsQuota ? (
          <Pressable
            accessibilityRole={smsLimitReached ? "button" : undefined}
            accessibilityLabel={
              smsLimitReached
                ? t("sms.quotaChoose")
                : undefined
            }
            disabled={!smsLimitReached}
            onPress={() => setIsUpgradeModalOpen(true)}
            style={({ pressed }) => [
              styles.quotaBanner,
              smsLimitReached && styles.quotaBannerAction,
              pressed && smsLimitReached && styles.pressed,
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={theme.primary}
            />
            <Text style={styles.quotaText}>
              {smsQuota.totalRemaining === null
                ? t("sms.quotaUnlimited")
                : t("sms.quotaRemaining", { count: smsQuota.totalRemaining })}
            </Text>
            {smsQuota.totalRemaining === 0 ? (
              <Text style={styles.quotaWarning}>{t("sms.limitReached")}</Text>
            ) : null}
          </Pressable>
        ) : null}
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
                  label: t("sms.filterBlacklist"),
                  icon: "warning-outline",
                },
                { key: "hasDebt", label: t("sms.filterDebtor"), icon: "wallet-outline" },
                {
                  key: "canSend",
                  label: t("sms.filterCanSend"),
                  icon: "checkmark-circle-outline",
                },
              ] as const
            )
              .filter(
                (item) => item.key !== "blacklisted" || blacklistAvailable,
              )
              .map((item) => {
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
          <Text style={styles.summaryText}>{t("sms.count", { count })}</Text>
          {capabilities.canSendBulk && hasSelectableRecipients ? (
            <Pressable
              onPress={() =>
                setSelected(
                  selected.size ? new Set() : selectEligibleRecipients(rows),
                )
              }
            >
              <Text style={styles.selectAll}>
                {selected.size ? t("sms.cancelSelection") : t("sms.selectAll")}
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
                {t("sms.sentSummary", {
                  sent: bulkSummary.sentCount,
                  failed: bulkSummary.failedCount,
                  skipped: bulkSummary.skippedCount,
                })}
              </Text>
              {bulkSummary.results.find((item) => item.errorMessage)
                ?.errorMessage ? (
                <Text style={styles.resultError} numberOfLines={2}>
                  {bulkSummary.results.find((item) => item.errorMessage)
                    ?.fullName ?? t("sms.clientFallback")}
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
              accessibilityLabel={t("sms.resultClose")}
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
            title={t("sms.listLoadError")}
            description={getLocalizedApiErrorMessage(
              recipients.error,
              "customers.fetchErrorDescription",
              t,
            )}
            action={
              <PrimaryButton
                label={t("customers.retry")}
                onPress={() => void recipients.refetch()}
              />
            }
          />
        ) : (
          <FlatList
            data={rows}
            keyExtractor={keyExtractor}
            renderItem={renderRecipient}
            contentContainerStyle={[
              styles.list,
              !rows.length && styles.emptyList,
              {
                paddingBottom: selected.size
                  ? 92 + insets.bottom
                  : 20 + insets.bottom,
              },
            ]}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
              <EmptyState
                iconName="chatbubble-ellipses-outline"
                title={t("sms.searchEmptyTitle")}
                description={t("sms.searchEmptyDescription")}
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
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews
          />
        )}
        {capabilities.canSendBulk && selected.size ? (
          <View style={[styles.footer, { paddingBottom: 10 }]}>
            <View>
              <Text style={styles.footerCount}>
                {t("sms.selectedCount", { count: selected.size })}
              </Text>
              <Text style={styles.footerHint}>
                {t("sms.selectedHint")}
              </Text>
            </View>
            <PrimaryButton
              label={t("sms.sendBulk")}
              loading={sendBulk.isPending}
              onPress={() => void submitBulk()}
              style={styles.footerButton}
            />
          </View>
        ) : null}
        {phoneEditorRecipient ? (
          <SmsRecipientPhoneEditor
            recipient={phoneEditorRecipient}
            onClose={() => setPhoneEditorRecipient(null)}
          />
        ) : null}
        <SubscriptionUpgradeModal
          visible={isUpgradeModalOpen}
          reason="sms-limit"
          subscription={user?.subscription}
          onClose={() => setIsUpgradeModalOpen(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SmsRecipientPhoneEditor({
  recipient,
  onClose,
}: {
  recipient: SmsRecipient;
  onClose: () => void;
}) {
  const { detail, update } = useClientDetail(recipient.id);
  const fallbackCustomer = useMemo<Customer>(
    () => ({
      id: recipient.id,
      fullName: recipient.fullName,
      phone: recipient.phone,
      note: "",
      currentBalance: recipient.currentBalance,
    }),
    [recipient],
  );
  const customer = detail.data ?? fallbackCustomer;

  return (
    <CustomerEditSheet
      customer={customer}
      ready={Boolean(detail.data)}
      dataState={
        detail.isError ? "error" : detail.data ? "ready" : "loading"
      }
      onSave={update.mutateAsync}
      onClose={onClose}
    />
  );
}

function Header({
  title,
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
          accessibilityLabel={t("common.back")}
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
    title: { flex: 1, ...typography.displayMedium, color: theme.text },
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
    quotaBanner: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginHorizontal: spacing.md,
      marginBottom: spacing.xs,
      paddingHorizontal: 11,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    quotaBannerAction: { borderWidth: 1, borderColor: `${theme.primary}55` },
    quotaText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    quotaWarning: {
      marginLeft: "auto",
      ...typography.caption,
      color: theme.dangerColor,
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
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
