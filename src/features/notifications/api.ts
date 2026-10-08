import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { NotificationSettings, Paged, Notification, UnreadCount } from "@/api/types";
import type { SaveNotificationSettingsRequest } from "@/api/mobileTypes";

/*
 * The person's notifications (the bell's list) and their push settings. Every key starts with "notifications",
 * so the live signal and a push reload them.
 */

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (unreadOnly: boolean) => ["notifications", "list", { unreadOnly }] as const,
  unread: ["notifications", "unread"] as const,
  settings: ["notifications", "settings"] as const,
};

const PAGE = 30;

export function useNotificationPages(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(unreadOnly),
    queryFn: async ({ pageParam }) =>
      (
        await http.get<Paged<Notification>>("/notifications", {
          params: { page: pageParam, pageSize: PAGE, unreadOnly: unreadOnly || undefined },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
  });
}

/** The unread count: the Alerts tab's badge. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () => (await http.get<UnreadCount>("/notifications/unread-count")).data.unread,
  });
}

/** Marks one read, or all of them; the count comes back with the answer. */
export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number | "all") =>
      (
        await http.post<UnreadCount>(
          id === "all" ? "/notifications/read-all" : `/notifications/${id}/read`,
        )
      ).data,
    onSuccess: (count) => {
      queryClient.setQueryData(notificationKeys.unread, count.unread);
      void queryClient.invalidateQueries({
        queryKey: notificationKeys.all,
        predicate: (q) => q.queryKey[1] === "list",
      });
    },
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationKeys.settings,
    queryFn: async () => (await http.get<NotificationSettings>("/me/notification-settings")).data,
  });
}

export function useSaveNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: SaveNotificationSettingsRequest) =>
      (await http.put<NotificationSettings>("/me/notification-settings", body)).data,
    onSuccess: (saved) => queryClient.setQueryData(notificationKeys.settings, saved),
  });
}
