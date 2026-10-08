import { useQueries, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Notification, Paged, UnreadCount } from "@/api/types";
import type { Domain } from "@/permissions/permissions";
import type { CompanyMonth, CompanyOverview, MoneyAttention } from "./model";

/*
 * The company's figures and money follow-ups (the API's docs/company.md and docs/finance.md). Billing changes
 * invalidate "company/overview" and "finance" (billing/api.ts).
 */

export const companyKeys = {
  overview: (from: string, to: string) => ["company", "overview", from, to] as const,
  monthly: (months: number) => ["company", "overview", "monthly", months] as const,
  attention: (domain: Domain) => ["finance", domain, "attention"] as const,
  // Under "notifications", so anything that reloads the bell reloads these too.
  unread: ["notifications", "company", "unread"] as const,
  recent: ["notifications", "company", "recent"] as const,
};

/** Both domains and the company over a window of company days (company:view). */
export function useCompanyOverview(range: { from: string; to: string }, enabled = true) {
  return useQuery({
    queryKey: companyKeys.overview(range.from, range.to),
    enabled,
    queryFn: async () =>
      (await http.get<CompanyOverview>("/company/overview", { params: range })).data,
  });
}

/** Revenue, costs and net profit month by month, oldest first, this month included (company:view). */
export function useCompanyMonthly(months: number, enabled = true) {
  return useQuery({
    queryKey: companyKeys.monthly(months),
    enabled,
    queryFn: async () =>
      (await http.get<CompanyMonth[]>("/company/overview/monthly", { params: { months } })).data,
  });
}

export type DomainAttention = { domain: Domain; item: MoneyAttention };

/** Each visible domain's money follow-ups, six at most each (financial:view), together. */
export function useMoneyAttention(domains: Domain[], enabled = true) {
  return useQueries({
    queries: domains.map((domain) => ({
      queryKey: companyKeys.attention(domain),
      enabled,
      queryFn: async () => (await http.get<MoneyAttention[]>(`/finance/${domain}/attention`)).data,
    })),
    combine: (results) => ({
      items: results.flatMap((r, i): DomainAttention[] =>
        (r.data ?? []).map((item) => ({ domain: domains[i], item })),
      ),
      isPending: results.some((r) => r.isPending && r.fetchStatus !== "idle"),
      error: results.find((r) => r.isError)?.error ?? null,
      isRefetching: results.some((r) => r.isRefetching),
      refetch: () => Promise.all(results.map((r) => r.refetch())),
    }),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: companyKeys.unread,
    queryFn: async () => (await http.get<UnreadCount>("/notifications/unread-count")).data.unread,
  });
}

/** The latest notifications, newest first; the screens keep the money ones. */
export function useRecentNotifications(enabled = true) {
  return useQuery({
    queryKey: companyKeys.recent,
    enabled,
    queryFn: async () =>
      (await http.get<Paged<Notification>>("/notifications", { params: { pageSize: 50 } })).data
        .items,
  });
}
