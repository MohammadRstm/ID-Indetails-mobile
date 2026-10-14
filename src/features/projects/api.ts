import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/api/http";
import type {
  Paged,
  Project,
  ProjectStatus,
  ProjectSummary,
  Schemas,
  SiteSummary,
} from "@/api/types";

/*
 * Projects, read only on the phone in Phase 2: the list, one project, and the site cards' figures. Every key
 * starts with "projects", so a material or labour week sent anywhere refreshes them.
 */

export type ProjectListParams = {
  domain?: "design" | "execution";
  status?: ProjectStatus;
  search?: string;
};

export type SiteRecords = Schemas["SiteRecordsResponse"];
export type ProjectWork = Schemas["ProjectWorkResponse"];

export const projectKeys = {
  all: ["projects"] as const,
  list: (params: ProjectListParams) => ["projects", "list", params] as const,
  detail: (id: number) => ["projects", "detail", id] as const,
  work: (id: number) => ["projects", "work", id] as const,
  siteSummary: (ids: number[]) => ["projects", "siteSummary", ids] as const,
  siteRecords: ["projects", "siteRecords"] as const,
};

/** Up to 100 projects the person can see, matching the filters, as the API orders them. */
export function useProjects(params: ProjectListParams, enabled = true) {
  const query = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""));
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async () =>
      (await http.get<Paged<ProjectSummary>>("/projects", { params: { ...query, pageSize: 100 } }))
        .data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => (await http.get<Project>(`/projects/${id}`)).data,
  });
}

/** Everyone's logged work on a Design project: its totals and who put the hours in. Needs work_entry:view_all. */
export function useProjectWork(id: number, enabled: boolean) {
  return useQuery({
    queryKey: projectKeys.work(id),
    queryFn: async () => (await http.get<ProjectWork>(`/projects/${id}/work`)).data,
    enabled,
  });
}

/** Each site's card: what was recorded there, and when the person last recorded something. */
export function useSiteSummaries(ids: number[]) {
  const sorted = [...ids].sort((a, b) => a - b);
  return useQuery({
    queryKey: projectKeys.siteSummary(sorted),
    queryFn: async () =>
      (await http.get<SiteSummary[]>("/projects/site-summary", { params: { ids: sorted } })).data,
    enabled: sorted.length > 0,
  });
}
