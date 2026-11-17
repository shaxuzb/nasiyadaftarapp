import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { SearchBar } from "../components/SearchBar";
import { useTheme } from "../hooks/useTheme";
import {
  formatLocalizedCurrency,
  formatLocalizedDate,
  formatLocalizedDateTime,
  useTranslation,
} from "../i18n";
import { useMoney } from "../modules/currency/hooks/useMoney";
import { HistoryList } from "../modules/history/components/HistoryList";
import {
  useDeletedClients,
  useOrganizationChanges,
  usePurchases,
} from "../modules/history/hooks/useHistory";
import type {
  DeletedClient,
  OrganizationChange,
  Purchase,
} from "../modules/history/utils/historyParsing";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import { getInitials } from "../utils";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Tab = "deleted" | "purchases" | "changes";
type Styles = ReturnType<typeof createStyles>;

const TABS: readonly Tab[] = ["deleted", "purchases", "changes"];

/**
 * "Tarix": customers deleted from the shop, the plans and SMS packages
 * bought, and what was changed in the shop. Read only. Each tab loads when
 * first opened, and keeps its place when the user switches back.
 */
export function HistoryScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("deleted");
  // Mounted once opened, then kept (hidden), so switching back is instant.
  const [opened, setOpened] = useState<ReadonlySet<Tab>>(() => new Set<Tab>(["deleted"]));

  const select = (next: Tab) => {
    setTab(next);
    setOpened((current) => (current.has(next) ? current : new Set([...current, next])));
  };

  const labels: Record<Tab, string> = {
    deleted: t("history.tabDeleted"),
    purchases: t("history.tabPurchases"),
    changes: t("history.tabChanges"),
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <Text style={styles.title}>{t("history.title")}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((item) => {
          const active = item === tab;
          return (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => select(item)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.tabText, active && styles.tabTextActive]}
              >
                {labels[item]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {TABS.map((item) =>
        opened.has(item) ? (
          <View key={item} style={[styles.page, item !== tab && styles.hidden]}>
            {item === "deleted" ? (
              <DeletedClientsTab styles={styles} theme={theme} navigation={navigation} />
            ) : item === "purchases" ? (
              <PurchasesTab styles={styles} theme={theme} />
            ) : (
              <ChangesTab styles={styles} theme={theme} navigation={navigation} />
            )}
          </View>
        ) : null,
      )}
    </SafeAreaView>
  );
}

/* O'chirilgan mijozlar */

function DeletedClientsTab({
  styles,
  theme,
  navigation,
}: {
  styles: Styles;
  theme: AppTheme;
  navigation: Navigation;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const query = useDeletedClients(debounced);

  const open = useCallback(
    (id: number) => navigation.navigate("DeletedClient", { clientId: id }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: { item: DeletedClient }) => (
      <DeletedClientRow client={item} onOpen={open} styles={styles} theme={theme} />
    ),
    [open, styles, theme],
  );

  return (
    <>
      <View style={styles.search}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={t("history.searchDeleted")}
        />
      </View>
      <HistoryList
        {...query}
        hasNextPage={query.hasNextPage ?? false}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        empty={
          debounced
            ? { icon: "search-outline", title: t("history.emptySearch") }
            : {
                icon: "trash-outline",
                title: t("history.emptyDeleted"),
                description: t("history.emptyDeletedHint"),
              }
        }
      />
    </>
  );
}

const DeletedClientRow = memo(function DeletedClientRow({
  client,
  onOpen,
  styles,
  theme,
}: {
  client: DeletedClient;
  onOpen: (id: number) => void;
  styles: Styles;
  theme: AppTheme;
}) {
  const { locale, t } = useTranslation();
  const money = useMoney();
  const name = client.fullName || client.phoneNumber || t("transactions.customerFallback");
  const initials = getInitials({ id: client.id, fullName: name, phone: client.phoneNumber });
  const deleted = client.deletedDate
    ? t("history.deletedOn", { date: formatLocalizedDateTime(client.deletedDate, locale) })
    : t("history.deletedDateUnknown");
  const balance = client.currencyCode
    ? formatLocalizedCurrency(client.currentBalance, locale, client.currencyCode)
    : money.format(client.currentBalance);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${deleted}`}
      onPress={() => onOpen(client.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, styles.avatarMuted]}>
        <Text style={[styles.initials, styles.initialsMuted]}>{initials}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {client.phoneNumber && client.fullName ? (
          <Text style={styles.meta} numberOfLines={1}>
            {client.phoneNumber}
          </Text>
        ) : null}
        <Text style={styles.meta} numberOfLines={2}>
          {client.deletedByUserName ? `${deleted} · ${client.deletedByUserName}` : deleted}
        </Text>
      </View>
      {client.currentBalance !== 0 ? (
        <View style={styles.trailing}>
          <Text style={styles.trailingLabel}>{t("history.debtLabel")}</Text>
          <Text
            numberOfLines={1}
            style={[
              styles.amount,
              { color: client.currentBalance > 0 ? theme.debtColor : theme.paymentColor },
            ]}
          >
            {balance}
          </Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
});

/* Xaridlar */

function PurchasesTab({ styles, theme }: { styles: Styles; theme: AppTheme }) {
  const { t } = useTranslation();
  const query = usePurchases();
  const renderItem = useCallback(
    ({ item }: { item: Purchase }) => <PurchaseRow purchase={item} styles={styles} theme={theme} />,
    [styles, theme],
  );
  return (
    <HistoryList
      {...query}
      hasNextPage={query.hasNextPage ?? false}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.kind}-${item.date ?? ""}-${item.name}-${item.startAt ?? ""}`}
      empty={{
        icon: "bag-handle-outline",
        title: t("history.emptyPurchases"),
        description: t("history.emptyPurchasesHint"),
      }}
    />
  );
}

const PurchaseRow = memo(function PurchaseRow({
  purchase,
  styles,
  theme,
}: {
  purchase: Purchase;
  styles: Styles;
  theme: AppTheme;
}) {
  const { locale, t } = useTranslation();
  const isSms = purchase.kind === "sms_package";
  const gift = purchase.source === "gift";
  const name =
    purchase.name || (isSms ? t("history.kindSms") : t("history.kindSubscription"));
  const detail = isSms
    ? purchase.smsCount
      ? t("history.smsCount", { count: purchase.smsCount })
      : null
    : purchase.startAt && purchase.endAt
      ? t("history.period", {
          start: formatLocalizedDate(purchase.startAt, locale),
          end: formatLocalizedDate(purchase.endAt, locale),
        })
      : null;
  const when = purchase.date ? formatLocalizedDateTime(purchase.date, locale) : null;
  const meta = [when, purchase.provider].filter(Boolean).join(" · ");

  return (
    <View style={styles.card} accessible accessibilityLabel={[name, detail, meta].filter(Boolean).join(", ")}>
      <View style={styles.icon}>
        <Ionicons
          name={gift ? "gift-outline" : isSms ? "chatbubbles-outline" : "pricetag-outline"}
          size={20}
          color={theme.primary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
        {detail ? (
          <Text style={styles.metaStrong} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <View style={styles.trailing}>
        {gift ? (
          <View style={styles.giftChip}>
            <Text style={styles.giftText}>{t("history.gift")}</Text>
          </View>
        ) : (
          <Text style={[styles.amount, { color: theme.text }]} numberOfLines={1}>
            {formatLocalizedCurrency(purchase.amount, locale)}
          </Text>
        )}
      </View>
    </View>
  );
});

/* Tashkilot o'zgarishlari */

function ChangesTab({
  styles,
  theme,
  navigation,
}: {
  styles: Styles;
  theme: AppTheme;
  navigation: Navigation;
}) {
  const { t } = useTranslation();
  const query = useOrganizationChanges();
  const open = useCallback(
    (id: number) => navigation.navigate("DeletedClient", { clientId: id }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: { item: OrganizationChange }) => (
      <ChangeRow change={item} onOpenClient={open} styles={styles} theme={theme} />
    ),
    [open, styles, theme],
  );
  return (
    <HistoryList
      {...query}
      hasNextPage={query.hasNextPage ?? false}
      renderItem={renderItem}
      keyExtractor={(item) => String(item.id)}
      empty={{
        icon: "time-outline",
        title: t("history.emptyChanges"),
        description: t("history.emptyChangesHint"),
      }}
    />
  );
}

const CHANGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  client_deleted: "person-remove-outline",
  name_changed: "storefront-outline",
  address_changed: "location-outline",
  currency_changed: "cash-outline",
  blacklist_days_changed: "warning-outline",
  staff_added: "person-add-outline",
  staff_removed: "person-remove-outline",
};

const ChangeRow = memo(function ChangeRow({
  change,
  onOpenClient,
  styles,
  theme,
}: {
  change: OrganizationChange;
  onOpenClient: (id: number) => void;
  styles: Styles;
  theme: AppTheme;
}) {
  const { locale, t } = useTranslation();
  const money = useMoney();
  const values = { old: change.oldValue || "—", new: change.newValue || "—" };
  let title: string;
  let detail: string | null = null;
  switch (change.type) {
    case "client_deleted": {
      title = t("history.changeClientDeleted", { name: change.oldValue || "—" });
      const debt = Number(change.newValue);
      if (change.newValue.trim() && Number.isFinite(debt) && debt !== 0) {
        detail = t("history.debtValue", { amount: money.format(debt) });
      }
      break;
    }
    case "name_changed":
      title = t("history.changeName", values);
      break;
    case "address_changed":
      title = t("history.changeAddress");
      detail = change.newValue.trim() || null;
      break;
    case "currency_changed":
      title = t("history.changeCurrency", values);
      break;
    case "blacklist_days_changed":
      title = t("history.changeBlacklistDays", values);
      break;
    case "staff_added":
      title = t("history.changeStaffAdded", { value: change.newValue || "—" });
      break;
    case "staff_removed":
      title = t("history.changeStaffRemoved", { value: change.oldValue || "—" });
      break;
    default:
      title =
        change.oldValue || change.newValue
          ? t("history.changeOther", values)
          : t("history.changeUnknown");
  }
  const meta = [change.userName, change.date ? formatLocalizedDateTime(change.date, locale) : null]
    .filter(Boolean)
    .join(" · ");
  const opensClient = change.type === "client_deleted" && change.clientId !== null;

  const content = (
    <>
      <View style={styles.icon}>
        <Ionicons
          name={CHANGE_ICONS[change.type] ?? "create-outline"}
          size={20}
          color={change.type === "client_deleted" ? theme.dangerColor : theme.primary}
        />
      </View>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={3}>
          {title}
        </Text>
        {detail ? (
          <Text style={styles.metaStrong} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
    </>
  );

  if (!opensClient) {
    return (
      <View style={styles.card} accessible accessibilityLabel={[title, detail, meta].filter(Boolean).join(", ")}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[title, detail, meta].filter(Boolean).join(", ")}
      onPress={() => onOpenClient(change.clientId as number)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.sm,
    },
    back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title: { flex: 1, textAlign: "center", ...typography.headingLarge, color: theme.text },
    tabs: {
      flexDirection: "row",
      gap: 4,
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: 4,
      borderRadius: radius.md,
      backgroundColor: theme.inputBackground,
    },
    tab: {
      flex: 1,
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 6,
      borderRadius: radius.sm,
    },
    tabActive: { backgroundColor: theme.surface },
    tabText: { fontSize: 13, fontWeight: "700", color: theme.textSecondary },
    tabTextActive: { color: theme.primary },
    page: { flex: 1 },
    hidden: { display: "none" },
    search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
    card: {
      minHeight: 68,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.md,
      paddingRight: spacing.sm,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.primaryLight,
    },
    avatarMuted: { backgroundColor: theme.inputBackground },
    initials: { color: theme.primary, fontWeight: "800", fontSize: 15 },
    initialsMuted: { color: theme.textMuted },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    name: { color: theme.text, fontSize: 14, lineHeight: 19, fontWeight: "700" },
    meta: { color: theme.textMuted, fontSize: 12, lineHeight: 16 },
    metaStrong: { color: theme.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: "600" },
    trailing: { alignItems: "flex-end", maxWidth: "38%" },
    trailingLabel: { color: theme.textMuted, fontSize: 11 },
    amount: { fontSize: 14, fontWeight: "800" },
    giftChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.full,
      backgroundColor: theme.primaryLight,
    },
    giftText: { color: theme.primary, fontSize: 12, fontWeight: "800" },
    pressed: { opacity: 0.72 },
  });
