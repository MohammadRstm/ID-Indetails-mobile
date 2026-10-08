import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { http } from "@/api/http";
import type {
  MyDay,
  MySchedule,
  OvertimePreview,
  Paged,
  Schemas,
  WorkEntry,
  WorkEntryDetail,
  WorkSummary,
} from "@/api/types";

/*
 * A Design person's own work (the API's design.md and me.md): their day, schedule, entries, projects, overtime,
 * hours and pay, and logging, changing and removing entries. Every figure comes from the API.
 */

export type MyProject = Schemas["MyProjectResponse"];
export type DomainSettings = Schemas["DomainSettingsResponse"];
export type SaveEntryBody = Schemas["SaveWorkEntryRequest"];
export type OvertimePreviewBody = Schemas["OvertimePreviewRequest"];
export type MyPay = Schemas["MyPayResponse"];
export type MyHours = Schemas["MyHoursResponse"];
export type MyOvertime = Schemas["MyOvertimeResponse"];

export const workKeys = {
  all: ["work"] as const,
  day: (date: string) => ["work", "day", date] as const,
  schedule: (date: string) => ["work", "schedule", date] as const,
  summary: ["work", "summary"] as const,
  projects: ["work", "projects"] as const,
  entries: ["work", "entries"] as const,
  entry: (id: number) => ["work", "entry", id] as const,
  pay: (month: string) => ["work", "pay", month] as const,
  hours: ["work", "hours"] as const,
  overtime: (month: string) => ["work", "overtime", month] as const,
  preview: (body: OvertimePreviewBody) => ["work", "preview", body] as const,
};

export const domainSettingsKey = (domain: string) => ["domainSettings", domain] as const;

/** The domain's time-tracking rules: the edit window, overlaps, future entries, descriptions and the timer. */
export function useDomainSettings(domain: string | null) {
  return useQuery({
    queryKey: domainSettingsKey(domain ?? ""),
    queryFn: async () => (await http.get<DomainSettings>(`/domain-settings/${domain}`)).data,
    enabled: domain != null,
    staleTime: 5 * 60_000,
  });
}

/** One day: the person's entries and the domain's meetings, earliest first. */
export function useMyDay(date: string, enabled = true) {
  return useQuery({
    queryKey: workKeys.day(date),
    queryFn: async () => (await http.get<MyDay>("/me/day", { params: { date } })).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** The day's working hours, what it asks for and what is logged, and the person's week. */
export function useMySchedule(date: string, enabled = true) {
  return useQuery({
    queryKey: workKeys.schedule(date),
    queryFn: async () => (await http.get<MySchedule>("/me/schedule", { params: { date } })).data,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    enabled,
  });
}

/** Today, this week day by day, this month, and time per project. */
export function useMyWorkSummary(enabled = true) {
  return useQuery({
    queryKey: workKeys.summary,
    queryFn: async () => (await http.get<WorkSummary>("/me/work-summary")).data,
    enabled,
  });
}

/** Every open Design project, with the person's own time on it. */
export function useMyProjects(enabled = true) {
  return useQuery({
    queryKey: workKeys.projects,
    queryFn: async () => (await http.get<MyProject[]>("/me/projects")).data,
    enabled,
  });
}

const ENTRY_PAGE = 25;

/** The person's entries, newest first, a page at a time. */
export function useMyEntries() {
  return useInfiniteQuery({
    queryKey: workKeys.entries,
    queryFn: async ({ pageParam }) =>
      (
        await http.get<Paged<WorkEntry>>("/me/work-entries", {
          params: { page: pageParam, pageSize: ENTRY_PAGE },
        })
      ).data,
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.totalCount ? last.page + 1 : undefined,
  });
}

/** One entry with its comments and the same day's other entries on its project. */
export function useWorkEntry(id: number) {
  return useQuery({
    queryKey: workKeys.entry(id),
    queryFn: async () => (await http.get<WorkEntryDetail>(`/work-entries/${id}`)).data,
  });
}

/** The month's hours ledger and its days. */
export function useMyPay(month: string) {
  return useQuery({
    queryKey: workKeys.pay(month),
    queryFn: async () => (await http.get<MyPay>("/me/pay", { params: { month } })).data,
    placeholderData: keepPreviousData,
  });
}

/** The hours balance, month by month, newest first. */
export function useMyHours() {
  return useQuery({
    queryKey: workKeys.hours,
    queryFn: async () => (await http.get<MyHours>("/me/hours", { params: { page: 1 } })).data,
  });
}

/** Overtime in a month, day by day. */
export function useMyOvertime(month: string) {
  return useQuery({
    queryKey: workKeys.overtime(month),
    queryFn: async () => (await http.get<MyOvertime>("/me/overtime", { params: { month } })).data,
    placeholderData: keepPreviousData,
  });
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return settled;
}

/**
 * How much of a piece of work would be overtime among the rest of the day (`POST /me/overtime-preview`), asked
 * once the times stop changing for a moment. The API works it out; the app keeps no copy of the rule.
 */
export function useOvertimePreview(body: OvertimePreviewBody | null, delayMs = 400) {
  const key = body ? JSON.stringify(body) : "";
  const settled = useDebounced(key, delayMs);
  const parsed = settled ? (JSON.parse(settled) as OvertimePreviewBody) : null;
  const query = useQuery({
    queryKey: workKeys.preview(parsed ?? {}),
    queryFn: async () => (await http.post<OvertimePreview>("/me/overtime-preview", parsed)).data,
    enabled: parsed != null,
    staleTime: 30_000,
  });
  // Only an answer for what is on screen now counts.
  return settled === key ? query.data : undefined;
}

/** Fetches a day afresh, bypassing the cache (to check whether a log whose answer was lost was saved). */
export async function fetchMyDay(date: string): Promise<MyDay> {
  return (await http.get<MyDay>("/me/day", { params: { date } })).data;
}

/** Every total and list built on work follows a change. */
function useWorkChanged() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: workKeys.all });
}

export function useSaveEntry() {
  const changed = useWorkChanged();
  return useMutation({
    mutationFn: async ({ id, body }: { id?: number; body: SaveEntryBody }) =>
      (id
        ? await http.put<WorkEntry>(`/work-entries/${id}`, body)
        : await http.post<WorkEntry>("/work-entries", body)
      ).data,
    onSuccess: changed,
  });
}

export function useDeleteEntry() {
  const changed = useWorkChanged();
  return useMutation({
    mutationFn: async (id: number) => {
      await http.delete(`/work-entries/${id}`);
    },
    onSuccess: changed,
  });
}

/** Puts a deleted entry back exactly as it was (Undo). */
export function useRestoreEntry() {
  const changed = useWorkChanged();
  return useMutation({
    mutationFn: async (id: number) =>
      (await http.post<WorkEntry>(`/work-entries/${id}/restore`)).data,
    onSuccess: changed,
  });
}

/** The body that saves an entry exactly as it is now (to undo an edit). */
export function entryBody(entry: WorkEntry): SaveEntryBody {
  return {
    projectId: entry.project.id,
    description: entry.description,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    attachmentFileId: entry.attachment?.id ?? null,
  };
}
