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
import { useAccountSecurity } from "../modules/account/context/AccountSecurityContext";
import { useTheme } from "../hooks/useTheme";
import { VideoLessonButton } from "../modules/video-lessons/components/VideoLessonEntry";
import { SmsRecipientRow } from "../modules/client-sms/components/SmsRecipientRow";
import { CustomerEditSheet } from "../modules/clients/components/CustomerEditSheet";
import { useClientDetail } from "../modules/clients/hooks/useClientDetail";
import {
  useSendBulkDebtSms,
  useSendDebtSms,
  useSmsRecipients,
} from "../modules/client-sms/hooks/useClientSms";
import type {
  BulkSmsResponse,
  SmsRecipient,
  SmsRecipientFilters,
} from "../modules/client-sms/types";
import { getClientSmsCapabilities } from "../modules/client-sms/utils/smsPermissions";
import {
  isSmsRecipientSelectable,
  selectEligibleRecipients,
  toggleRecipientSelection,
} from "../modules/client-sms/utils/recipientSelection";
import {
  getBulkResultTone,
  groupSmsIssues,
} from "../modules/client-sms/utils/smsResults";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import type { Customer } from "../modules/clients/types";
import {
  getLocalizedApiErrorMessage,
  useTranslation,
} from "../i18n";
import { previewDebtSms } from "../modules/client-sms/services/clientSmsService";
import { SubscriptionUpgradeModal } from "../modules/subscription/components/SubscriptionUpgradeModal";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function isBottomTabNavigation(navigation: Nav) {
  return (navigation.getState() as unknown as { type?: string }).type === "tab";
}

// The result card is a summary; the full list is in the SMS history.
const MAX_ISSUE_LINES = 3;

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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { confirm } = useConfirmDialog();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { requireVerifiedPhone } = useAccountSecurity();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkSummary, setBulkSummary] = useState<BulkSmsResponse | null>(null);
  // Skipped and failed recipients grouped by reason, so a batch where thirty
  // clients already had today's SMS reads as one line, not the first of thirty.
  const issueGroups = useMemo(
    () => (bulkSummary ? groupSmsIssues(bulkSummary.results) : []),
    [bulkSummary],
  );
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  // What the sheet opens on: plans and packages when a send hit the limit,
  // packages alone when the user pressed "buy".
  const [upgradeReason, setUpgradeReason] = useState<
    "sms-limit" | "sms-packages"
  >("sms-limit");
  const [phoneEditorRecipient, setPhoneEditorRecipient] =
    useState<SmsRecipient | null>(null);
  const submitting = useRef(false);
  // The ref blocks a second tap synchronously; this state is what the buttons
  // render, since a ref change never repaints them.
  const [sendingTarget, setSendingTarget] = useState<number | "bulk" | null>(
    null,
  );
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    setSelected(new Set());
    setBulkSummary(null);
  }, [debouncedSearch]);
  // The list is who a debt reminder can go to: customers who owe something.
  // That is fixed, not a switch on the screen, so nobody has to remember to
  // turn it on and nobody is shown a customer there is nothing to remind of.
  const queryFilters = useMemo<SmsRecipientFilters>(
    () => ({
      search: debouncedSearch || undefined,
      hasDebt: true,
    }),
    [debouncedSearch],
  );
  const recipients = useSmsRecipients(queryFilters);
  const sendOne = useSendDebtSms();
  const sendBulk = useSendBulkDebtSms();
  const rows = recipients.data?.results ?? [];
  const count = recipients.data?.count ?? 0;
  const hasSelectableRecipients = useMemo(
    () => rows.some(isSmsRecipientSelectable),
    [rows],
  );
  const smsQuota = user?.subscription?.sms;
  // Queue capacity and eligibility are determined by the backend preview.
  const smsLimitReached = false;

  const toggle = useCallback(
    (id: number) =>
      setSelected((current) => toggleRecipientSelection(current, id)),
    [],
  );
  const keyExtractor = useCallback((item: SmsRecipient) => String(item.id), []);
  // Runs only once the owner's phone is known to be verified. It must not ask
  // again: after verification it is invoked from a closure created before the
  // user object updated, which would still read as unverified and reopen the
  // verification modal.
  const performSendOne = useCallback(
    async (recipient: SmsRecipient) => {
      if (submitting.current) return;
      submitting.current = true;
      setSendingTarget(recipient.id);
      try {
        const preview = await previewDebtSms([recipient.id]);
        const accepted = await confirm({
          title: t("sms.sendTitle"),
          message: `${preview.message}\n\n${t("sms.recipientConfirmation", { name: recipient.fullName })}`,
          confirmText: t("sms.sendAction"),
          cancelText: t("common.cancel"),
        });
        if (!accepted || preview.eligible === 0) return;
        const result = await sendOne.mutateAsync(recipient.id);
        showToast(result.status.toLowerCase() === "queued" ? t("sms.queuedSingle") : result.status.toLowerCase() === "failed" ? (result.errorMessage || t("sms.sendError")) : t("sms.sendAccepted"), result.status.toLowerCase() === "queued" ? "info" : result.status.toLowerCase() === "failed" ? "error" : "success");
      } catch (error) {
        // A client who already had today's SMS comes back as a 400 whose detail
        // says so; getLocalizedApiErrorMessage shows that text as is.
        showToast(getLocalizedApiErrorMessage(error, "sms.sendError", t), "error");
      } finally {
        submitting.current = false;
        setSendingTarget(null);
      }
    },
    [
      confirm,
      sendOne,
      showToast,
      t,
    ],
  );

  const sendToOne = useCallback(
    (recipient: SmsRecipient) => {
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
      // SMS go out only for an organization whose owner has a verified phone.
      // Unverified, this opens the verification modal and continues to the send
      // confirmation once the code is accepted; closing the modal sends nothing.
      requireVerifiedPhone(() => void performSendOne(recipient), "sms");
    },
    [
      capabilities.canSendOne,
      performSendOne,
      requireVerifiedPhone,
      smsLimitReached,
    ],
  );
  const submitBulk = () => {
    if (smsLimitReached) {
      setIsUpgradeModalOpen(true);
      return;
    }
    if (submitting.current || !capabilities.canSendBulk || !selected.size)
      return;
    // Same rule as a single send. The selection is captured now, so what gets
    // sent after verification is exactly what was selected when tapped.
    const recipientIds = [...selected];
    requireVerifiedPhone(() => void performBulkSend(recipientIds), "sms");
  };

  // Must not re-check verification; see performSendOne.
  const performBulkSend = async (recipientIds: number[]) => {
    if (submitting.current) return;
    submitting.current = true;
    setSendingTarget("bulk");
    try {
      const preview = await previewDebtSms(recipientIds);
      const accepted = await confirm({
        title: t("sms.templateTitle"),
        message: `${preview.message}\n\n${t("sms.bulkConfirmation", { count: recipientIds.length })}`,
        confirmText: t("sms.sendAction"),
        cancelText: t("common.cancel"),
      });
      if (!accepted || preview.eligible === 0) return;
      const result = await sendBulk.mutateAsync(recipientIds);
      setBulkSummary(result);
      showToast(
        t("sms.sentSummary", {
          sent: result.sentCount,
          queued: result.queuedCount,
          skipped: result.skippedCount,
        }),
        getBulkResultTone(result),
      );
      setSelected(new Set());
    } catch (error) {
      showToast(getLocalizedApiErrorMessage(error, "sms.bulkSendError", t), "error");
    } finally {
      submitting.current = false;
      setSendingTarget(null);
    }
  };
  // Stable handlers: inline arrows here were new on every render and defeated
  // the memo on SmsRecipientRow, repainting every visible row each time.
  const handleSend = useCallback(
    (recipient: SmsRecipient) => void sendToOne(recipient),
    [sendToOne],
  );
  const openUpgradeModal = useCallback(() => {
    setUpgradeReason("sms-limit");
    setIsUpgradeModalOpen(true);
  }, []);
  const openSmsPackages = useCallback(() => {
    setUpgradeReason("sms-packages");
    setIsUpgradeModalOpen(true);
  }, []);
  const renderRecipient = useCallback(
    ({ item }: { item: SmsRecipient }) => (
      <SmsRecipientRow
        recipient={item}
        selected={selected.has(item.id)}
        selectable={capabilities.canSendBulk}
        canSendOne={capabilities.canSendOne}
        onToggle={toggle}
        onSend={handleSend}
        onAddPhone={setPhoneEditorRecipient}
        onQuotaReached={smsLimitReached ? openUpgradeModal : undefined}
        sending={sendingTarget === item.id}
        sendDisabled={sendingTarget !== null}
      />
    ),
    [
      capabilities.canSendBulk,
      capabilities.canSendOne,
      handleSend,
      openUpgradeModal,
      selected,
      sendingTarget,
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
            <View style={styles.headerActions}>
              <VideoLessonButton lessonId="sms" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("smsSettings.title")}
                hitSlop={4}
                onPress={() => navigation.navigate("SmsSettings")}
                style={({ pressed }) => [
                  styles.headerIconButton,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="settings-outline" size={21} color={theme.primary} />
              </Pressable>
              {capabilities.canViewHistory ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("sms.history")}
                  onPress={() => navigation.navigate("ClientSmsHistory")}
                  style={styles.headerAction}
                >
                  <Ionicons name="time-outline" size={21} color={theme.primary} />
                  <Text style={styles.headerActionText}>{t("sms.historyAction")}</Text>
                </Pressable>
              ) : null}
            </View>
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
          <View
            style={[
              styles.quotaBanner,
              smsLimitReached && styles.quotaBannerAction,
            ]}
          >
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={18}
              color={theme.primary}
            />
            <View style={styles.quotaCopy}>
              <Text style={styles.quotaText}>
                {smsQuota.totalRemaining === null
                  ? t("sms.quotaUnlimited")
                  : t("sms.quotaRemaining", { count: smsQuota.totalRemaining })}
              </Text>
              {smsLimitReached ? (
                <Text style={styles.quotaWarning}>{t("sms.limitReached")}</Text>
              ) : null}
            </View>
            {/* Unlimited SMS leaves nothing to buy. */}
            {smsQuota.totalRemaining !== null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("subscription.purchasePackage")}
                hitSlop={8}
                onPress={openSmsPackages}
                style={({ pressed }) => [
                  styles.quotaBuy,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons name="add" size={15} color="#FFFFFF" />
                <Text style={styles.quotaBuyText}>{t("sms.buyPackage")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
                  queued: bulkSummary.queuedCount,
                  skipped: bulkSummary.skippedCount,
                })}
              </Text>
              {issueGroups.slice(0, MAX_ISSUE_LINES).map((group) => (
                <Text
                  key={group.reason}
                  style={styles.resultError}
                  numberOfLines={1}
                >
                  {group.reason} · {group.count}
                </Text>
              ))}
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
                title={
                  debouncedSearch
                    ? t("sms.searchEmptyTitle")
                    : t("sms.emptyTitle")
                }
                description={
                  debouncedSearch
                    ? t("sms.searchEmptyDescription")
                    : t("sms.emptyDescription")
                }
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
              loading={sendingTarget === "bulk"}
              disabled={sendingTarget !== null}
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
          reason={upgradeReason}
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
    headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
    // Round and tinted, the same as the lesson button beside it.
    headerIconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
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
      marginBottom: spacing.sm,
      paddingHorizontal: 11,
      borderRadius: radius.md,
      backgroundColor: theme.primaryLight,
    },
    quotaBannerAction: { borderWidth: 1, borderColor: `${theme.primary}55` },
    // The count and, at zero, the warning. They sit side by side and wrap
    // onto two lines on a narrow phone instead of pushing the button out.
    quotaCopy: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      columnGap: 8,
      paddingVertical: 6,
    },
    quotaText: {
      ...typography.caption,
      color: theme.textSecondary,
      fontWeight: "700",
    },
    quotaWarning: {
      ...typography.caption,
      color: theme.dangerColor,
      fontWeight: "800",
    },
    // A small pill, not a full button: the card is a status line first.
    quotaBuy: {
      height: 28,
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      paddingLeft: 7,
      paddingRight: 11,
      borderRadius: radius.full,
      backgroundColor: theme.primary,
    },
    quotaBuyText: {
      ...typography.caption,
      color: "#FFFFFF",
      fontWeight: "800",
    },
    pressed: { opacity: 0.72 },
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
    list: { paddingHorizontal: spacing.md, paddingTop: 6 },
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
