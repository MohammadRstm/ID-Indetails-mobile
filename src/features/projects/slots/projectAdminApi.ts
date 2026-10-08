import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { Paged, Project, ProjectStatus, ProjectSummary, Schemas } from "@/api/types";

/*
 * The project reads and changes Phase 3's screens and slots need. The keys follow the web's scheme (every key
 * starts with its area), so they share a cache with the project screens and a change refreshes them by prefix.
 */

export const projectKeys = {
  all: ["projects"] as const,
  list: (params: object) => ["projects", "list", params] as const,
  detail: (id: number) => ["projects", "detail", id] as const,
};

/** The areas a change to a project can move: its requirements (closing ticks them), the feeds and the lists. */
const STATUS_CHANGE_REFRESHES = [
  ["projects"],
  ["requirements"],
  ["activity"],
  ["dashboard"],
  ["clients"],
  ["finance"],
] as const;

export function useProject(id: number, enabled = true) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => (await http.get<Project>(`/projects/${id}`)).data,
    enabled,
  });
}

export type ProjectListParams = {
  domain?: string;
  clientId?: number;
  status?: ProjectStatus;
  sort?: Schemas["ProjectSort"];
  pageSize?: number;
};

/** One page of projects, filtered. */
export function useProjectList(params: ProjectListParams, enabled = true) {
  const p = Object.fromEntries(
    Object.entries({ page: 1, pageSize: 50, ...params }).filter(([, v]) => v !== undefined),
  );
  return useQuery({
    queryKey: projectKeys.list(p),
    queryFn: async () =>
      (await http.get<Paged<ProjectSummary>>("/projects", { params: p })).data,
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** A status change, named as the API's endpoint is. */
export type StatusAction = "hold" | "resume" | "complete" | "archive" | "reopen";

/** What the API allows from each status (Business/Projects/ProjectStatusRules.cs). The API decides again. */
export const STATUS_ACTIONS: Record<ProjectStatus, StatusAction[]> = {
  active: ["hold", "complete", "archive"],
  hold: ["resume", "complete", "archive"],
  completed: ["archive", "reopen"],
  archived: ["reopen"],
};

export function useChangeProjectStatus(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: StatusAction) =>
      (await http.post<Project>(`/projects/${id}/${action}`)).data,
    onSuccess: () =>
      Promise.all(
        STATUS_CHANGE_REFRESHES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}

/**
 * A new owner. The API's edit replaces every detail, so the project's current details go with it unchanged.
 */
export function useChangeProjectOwner(project: Project) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ownerId: number) => {
      const body: Schemas["UpdateProjectRequest"] = {
        title: project.title,
        description: project.description,
        location: project.location,
        icon: project.icon,
        tint: project.tint,
        targetDate: project.targetDate,
        ownerId,
      };
      return (await http.put<Project>(`/projects/${project.id}`, body)).data;
    },
    onSuccess: () =>
      Promise.all(
        [projectKeys.all, ["activity"]].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
