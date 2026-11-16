import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { Ionicons } from "@expo/vector-icons";

import { EmptyState } from "../../../components/EmptyState";
import { useTheme } from "../../../hooks/useTheme";
import { getLocalizedApiErrorMessage, useTranslation } from "../../../i18n";
import { spacing, typography } from "../../../theme";
import type { AppTheme } from "../../../types";

interface HistoryListProps<T> {
  rows: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T) => string;
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => unknown;
  refetch: () => unknown;
  empty: { icon: keyof typeof Ionicons.glyphMap; title: string; description?: string };
  header?: React.ReactElement | null;
}

/**
 * One tab of "Tarix": the first load, a failure with a retry, an empty state
 * that says what would appear here, the rows a page at a time, and pull to
 * refresh. The three tabs differ only in their rows.
 */
export function HistoryList<T>({
  rows,
  renderItem,
  keyExtractor,
  isPending,
  isError,
  error,
  isRefetching,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  refetch,
  empty,
  header,
}: HistoryListProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { t } = useTranslation();
  const Separator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  let body: React.ReactElement;
  if (isPending) {
    body = <ActivityIndicator style={styles.loading} color={theme.primary} />;
  } else if (isError && rows.length === 0) {
    body = (
      <View style={styles.center}>
        <Text style={styles.message}>
          {getLocalizedApiErrorMessage(error, "history.loadError", t)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void refetch()}
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <Text style={styles.retryText}>{t("common.retry")}</Text>
        </Pressable>
      </View>
    );
  } else {
    body = (
      <EmptyState iconName={empty.icon} title={empty.title} description={empty.description} />
    );
  }

  return (
    <FlatList
      data={rows}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      ListEmptyComponent={body}
      ListFooterComponent={
        isFetchingNextPage ? (
          <ActivityIndicator style={styles.more} color={theme.primary} />
        ) : null
      }
      contentContainerStyle={[styles.list, rows.length === 0 && styles.listEmpty]}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.45}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={12}
      windowSize={7}
      showsVerticalScrollIndicator={false}
    />
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
    listEmpty: { flexGrow: 1 },
    separator: { height: spacing.sm },
    loading: { marginTop: spacing.xl },
    more: { marginVertical: spacing.md },
    center: {
      flex: 1,
      minHeight: 240,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.lg,
    },
    message: { ...typography.bodyMedium, color: theme.textSecondary, textAlign: "center" },
    retry: {
      minHeight: 42,
      paddingHorizontal: spacing.lg,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: theme.primary,
    },
    retryText: { ...typography.bodySmall, color: theme.surface, fontWeight: "800" },
    pressed: { opacity: 0.72 },
  });
