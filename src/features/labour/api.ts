import { useQueries, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { LabourWeek, Schemas } from "@/api/types";

/*
 * A site's ground labour: its weeks and one week's days (with the version the phone sends back when it submits).
 * Submitting goes through the outbox (src/offline), so it works without signal.
 */

export type LabourWeekList = Schemas["LabourWeekListResponse"];

export const labourKeys = {
  all: ["labour"] as const,
  site: (projectId: number) => ["labour", projectId] as const,
  weeks: (projectId: number) => ["labour", projectId, "weeks"] as const,
  week: (projectId: number, weekStart: string) => ["labour", projectId, "week", weekStart] as const,
};

const fetchWeeks = async (projectId: number) =>
  (await http.get<LabourWeekList>(`/projects/${projectId}/labour-weeks`)).data;

export function useLabourWeeks(projectId: number, enabled = true) {
  return useQuery({
    queryKey: labourKeys.weeks(projectId),
    queryFn: () => fetchWeeks(projectId),
    enabled,
  });
}

/** Several sites' weeks at once (Today's "this week" status). */
export function useLabourWeeksOf(projectIds: number[]) {
  return useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: labourKeys.weeks(projectId),
      queryFn: () => fetchWeeks(projectId),
    })),
  });
}

/** One week: as reported, or filled in from the defaults up to today. */
export function useLabourWeek(projectId: number, weekStart: string) {
  return useQuery({
    queryKey: labourKeys.week(projectId, weekStart),
    queryFn: async () =>
      (await http.get<LabourWeek>(`/projects/${projectId}/labour-weeks/${weekStart}`)).data,
  });
}
