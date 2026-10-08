import { useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Meeting, Schemas, UnreadCount } from "@/api/types";

/*
 * What an admin's Today reads. Keys follow the web's areas ("dashboard", "meetings", "notifications"), so changes
 * elsewhere refresh them by prefix.
 */

export type Deadlines = Schemas["UpcomingDeadlinesResponse"];
export type Deadline = Schemas["DeadlineResponse"];
export type AttentionItem = Schemas["AttentionItemResponse"];

/** Open requirements of the domain due in the next 14 days, overdue ones included, soonest first (report:view). */
export function useDeadlines(domain: string, enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", domain, "deadlines"],
    queryFn: async () => (await http.get<Deadlines>(`/dashboard/${domain}/deadlines`)).data,
    enabled,
  });
}

/**
 * The Design dashboard's "Needs attention": idle projects, projects nearly done, projects on hold and people not
 * logging, by the API's own rules (report:view, Design).
 */
export function useAttention(enabled: boolean) {
  return useQuery({
    queryKey: ["dashboard", "overview", "month"],
    queryFn: async () =>
      (
        await http.get<Schemas["OverviewResponse"]>("/reports/overview", {
          params: { period: "month" },
        })
      ).data,
    select: (overview) => overview.attention,
    enabled,
  });
}

/** The domain's meetings on a company day. */
export function useMeetingsOn(domain: string, day: string) {
  const params = { domain, from: day, to: day };
  return useQuery({
    queryKey: ["meetings", "list", params],
    queryFn: async () => (await http.get<Meeting[]>("/meetings", { params })).data,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => (await http.get<UnreadCount>("/notifications/unread-count")).data,
    select: (count) => count.unread,
  });
}
