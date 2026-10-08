import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { ActivityItem, Paged, Schemas } from "@/api/types";

/* The activity feed (activity:view; work events only with work_entry:view_all, amounts only with financial:view). */

export type ActivityGroup = Schemas["ActivityGroup"];

export type FeedFilters = {
  domain?: string;
  group?: ActivityGroup;
  projectId?: number;
};

export const activityKeys = {
  all: ["activity"] as const,
  feed: (filters: FeedFilters) => ["activity", "feed", filters] as const,
  recent: (filters: FeedFilters, count: number) => ["activity", "recent", filters, count] as const,
};

const PAGE = 40;

const clean = (filters: FeedFilters): FeedFilters =>
  Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined));

/** The feed, newest first, a page at a time. */
export function useActivityFeed(filters: FeedFilters, enabled = true) {
  const params = clean(filters);
  return useInfiniteQuery({
    queryKey: activityKeys.feed(params),
    queryFn: async ({ pageParam }) =>
      (
        await http.get<Paged<ActivityItem>>("/activity", {
          params: { ...params, page: pageParam, pageSize: PAGE },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The latest few events, for a summary. */
export function useRecentActivity(filters: FeedFilters, count: number, enabled = true) {
  const params = clean(filters);
  return useQuery({
    queryKey: activityKeys.recent(params, count),
    queryFn: async () =>
      (
        await http.get<Paged<ActivityItem>>("/activity", {
          params: { ...params, page: 1, pageSize: count },
        })
      ).data.items,
    enabled,
  });
}
