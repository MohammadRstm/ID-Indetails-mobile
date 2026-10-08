import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Employee, EmployeeSummary, Paged, Schemas } from "@/api/types";

/*
 * People: the list, one person, and what they worked on or recorded. Every key starts with "employees", the web's
 * area name, so a change elsewhere can refresh the area by prefix.
 */

export type PersonWork = Schemas["PersonWorkResponse"];
export type WorkSummary = Schemas["WorkSummaryResponse"];
export type SiteRecords = Schemas["SiteRecordsResponse"];
export type WorkEntry = Schemas["WorkEntryResponse"];
export type UserStatus = Schemas["UserStatus"];

export type EmployeeListParams = {
  domain?: string;
  role?: "employee" | "admin" | "super_admin";
  status?: UserStatus;
  search?: string;
  pageSize?: number;
};

export const employeeKeys = {
  all: ["employees"] as const,
  list: (params: EmployeeListParams) => ["employees", "list", params] as const,
  work: ["employees", "work"] as const,
  detail: (id: number) => ["employees", "detail", id] as const,
  workSummary: (id: number) => ["employees", "work-summary", id] as const,
  entries: (id: number) => ["employees", "entries", id] as const,
  siteRecords: (id: number) => ["employees", "site-records", id] as const,
};

/** "Nadia Karam", or the email when no name was given (the web's personName). */
export const personName = (p: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}) => `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.email;

function clean<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
  ) as Partial<T>;
}

/** One page of people (the API's largest), for lists and pickers. Deactivated people only when asked for. */
export function useEmployees(params: EmployeeListParams, enabled = true) {
  const p = clean({ pageSize: 100, ...params });
  return useQuery({
    queryKey: employeeKeys.list(p),
    queryFn: async () =>
      (await http.get<Paged<EmployeeSummary>>("/employees", { params: p })).data.items,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Everyone's week and current focus (work_entry:view_all; Design). */
export function usePeopleWork(enabled = true) {
  return useQuery({
    queryKey: employeeKeys.work,
    queryFn: async () => (await http.get<PersonWork[]>("/work/people")).data,
    enabled,
  });
}

export function useEmployee(id: number) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: async () => (await http.get<Employee>(`/employees/${id}`)).data,
  });
}

/** A Design person's work totals and projects (work_entry:view_all). */
export function useWorkSummary(id: number, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.workSummary(id),
    queryFn: async () =>
      (await http.get<WorkSummary>(`/employees/${id}/work-summary`)).data,
    enabled,
  });
}

const RECENT_ENTRIES = 8;

/** Their newest work entries (work_entry:view_all). */
export function useRecentEntries(id: number, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.entries(id),
    queryFn: async () =>
      (
        await http.get<Paged<WorkEntry>>("/work-entries", {
          params: { userId: id, page: 1, pageSize: RECENT_ENTRIES },
        })
      ).data.items,
    enabled,
  });
}

/** What an Execution person recorded on sites (employee:view). */
export function useSiteRecords(id: number, enabled: boolean) {
  return useQuery({
    queryKey: employeeKeys.siteRecords(id),
    queryFn: async () =>
      (await http.get<SiteRecords>(`/employees/${id}/site-records`)).data,
    enabled,
  });
}
