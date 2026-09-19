import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState } from "../components/EmptyState";
import { PrimaryButton } from "../components/PrimaryButton";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../hooks/useTheme";
import { formatLocalizedDate, useTranslation } from "../i18n";
import {
  useMarkPushNotificationRead,
  usePushNotificationList,
} from "../modules/push/hooks/usePushQueries";
import { radius, spacing, typography } from "../theme";
import type { AppTheme, RootStackParamList } from "../types";
import type { PushNotification } from "../modules/push/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type ScreenRoute = RouteProp<RootStackParamList, "Notifications">;

export function NotificationsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { locale, t } = useTranslation();
  const { showToast } = useToast();
  const listRef = useRef<FlatList<PushNotification>>(null);
  const query = usePushNotificationList();
  const markRead = useMarkPushNotificationRead();
  const items = query.data?.pages.flatMap((page) => page.results) ?? [];
  const highlightId = route.params?.highlightId;

  useEffect(() => {
    if (!highlightId || !items.length) return;
    const index = items.findIndex((item) => item.id === highlightId);
    if (index < 0) return;
    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: true });
    }, 80);
    return () => clearTimeout(timeout);
  }, [highlightId, items]);

  const renderItem = ({ item }: { item: PushNotification }) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.body}`}
      onPress={() => {
        if (!item.isRead) {
          markRead.mutate(item.id, {
            onError: () => showToast(t("notifications.readError"), "error"),
          });
        }
      }}
      style={({ pressed }) => [
        styles.row,
        !item.isRead && styles.unreadRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, !item.isRead && styles.unreadIcon]}>
        <Ionicons
          name={item.isRead ? "notifications-outline" : "notifications"}
          size={20}
          color={theme.primary}
        />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title || t("notifications.screenTitle")}
          </Text>
          {!item.isRead ? <View style={styles.dot} /> : null}
        </View>
        <Text style={styles.body}>{item.body}</Text>
        <Text style={styles.date}>
          {formatLocalizedDate(item.createdDate, locale)}
        </Text>
      </View>
    </Pressable>
  );

  const content =
    query.isPending && !items.length ? (
      <View style={styles.center}>
        <ActivityIndicator color={theme.primary} />
        <Text style={styles.muted}>{t("notifications.loading")}</Text>
      </View>
    ) : query.isError && !items.length ? (
      <View style={styles.center}>
        <EmptyState
          iconName="cloud-offline-outline"
          title={t("notifications.loadError")}
          description={t("common.retryDescription")}
          action={
            <PrimaryButton
              label={t("notifications.retry")}
              onPress={() => void query.refetch()}
            />
          }
        />
      </View>
    ) : (
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, !items.length && styles.listEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching}
            onRefresh={() => void query.refetch()}
            tintColor={theme.primary}
          />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.45}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({ offset: Math.max(index * 84, 0) });
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState
              iconName="notifications-off-outline"
              title={t("notifications.emptyTitle")}
              description={t("notifications.emptyDescription")}
            />
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator color={theme.primary} style={styles.footer} />
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={23} color={theme.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("notifications.screenTitle")}</Text>
        <View style={styles.headerButton} />
      </View>
      {content}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 56,
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
    headerTitle: {
      flex: 1,
      textAlign: "center",
      ...typography.headingLarge,
      color: theme.text,
    },
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    listEmpty: { flexGrow: 1 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: radius.lg,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    unreadRow: { borderColor: theme.primary, backgroundColor: theme.inputBackground },
    icon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.inputBackground,
    },
    unreadIcon: { backgroundColor: theme.primaryLight },
    copy: { flex: 1, minWidth: 0, gap: 3 },
    titleLine: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { flex: 1, ...typography.bodyMedium, color: theme.text, fontWeight: "800" },
    body: { ...typography.bodySmall, color: theme.textSecondary },
    date: { ...typography.caption, color: theme.textMuted },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.primary },
    center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
    muted: { ...typography.caption, color: theme.textMuted },
    emptyWrap: { flex: 1, minHeight: 360, justifyContent: "center" },
    footer: { paddingVertical: spacing.md },
    pressed: { opacity: 0.72 },
  });
