import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { queryKeys } from "../../../core/query/queryKeys";
import {
  getPushNotifications,
  getUnreadPushNotificationCount,
  markPushNotificationRead,
} from "../services/pushService";
import type { PushNotificationPage } from "../types";

const DEFAULT_PAGE_SIZE = 20;

function usePushScope() {
  const { user } = useAuth();
  return user?.id ?? "anonymous";
}

export function usePushNotificationList(pageSize = DEFAULT_PAGE_SIZE) {
  const scope = usePushScope();
  return useInfiniteQuery<PushNotificationPage>({
    queryKey: queryKeys.pushNotifications(scope, pageSize),
    queryFn: ({ pageParam, signal }) =>
      getPushNotifications(
        { page: Number(pageParam), pageSize },
        signal,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce(
        (total, page) => total + page.results.length,
        0,
      );
      return loaded < lastPage.count ? allPages.length + 1 : undefined;
    },
    enabled: scope !== "anonymous",
    staleTime: 15_000,
  });
}

export function useUnreadPushNotificationCount() {
  const scope = usePushScope();
  return useQuery({
    queryKey: queryKeys.pushUnreadCount(scope),
    queryFn: ({ signal }) => getUnreadPushNotificationCount(signal),
    enabled: scope !== "anonymous",
    staleTime: 15_000,
    refetchInterval: 60_000,
  });
}

export function useMarkPushNotificationRead() {
  const queryClient = useQueryClient();
  const scope = usePushScope();
  return useMutation({
    mutationFn: markPushNotificationRead,
    onMutate: async (id) => {
      const key = queryKeys.pushNotifications(scope, DEFAULT_PAGE_SIZE);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<
        InfiniteData<PushNotificationPage, number>
      >(key);
      queryClient.setQueryData<
        InfiniteData<PushNotificationPage, number>
      >(key, (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            results: page.results.map((item) =>
              item.id === id ? { ...item, isRead: true } : item,
            ),
          })),
        };
      });
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.pushNotifications(scope, DEFAULT_PAGE_SIZE),
          context.previous,
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.pushUnreadCount(scope),
      });
    },
  });
}
