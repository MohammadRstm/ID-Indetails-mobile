import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { ProjectStatus, Requirement, Schemas } from "@/api/types";

/*
 * Adding, editing, ticking and removing requirements (requirement:manage). Keys follow the web's scheme, shared
 * with the requirement screens: ["requirements", projectId] for a project's list.
 */

export type RequirementList = Schemas["RequirementListResponse"];
export type SaveRequirementBody = { text: string; deadline: string | null; assigneeIds: number[] };

export const requirementKeys = {
  all: ["requirements"] as const,
  project: (projectId: number) => ["requirements", projectId] as const,
};

/** A completed or archived project's requirements stay as they were closed until it is reopened (project_closed). */
export const requirementsLocked = (status: ProjectStatus) =>
  status === "completed" || status === "archived";

/** A requirement moves its project's progress, which the project lists, dashboards and feeds show. */
const REQUIREMENT_CHANGE_REFRESHES = [
  ["requirements"],
  ["projects"],
  ["dashboard"],
  ["activity"],
  ["work"],
] as const;

export function useRequirementList(projectId: number, enabled = true) {
  return useQuery({
    queryKey: requirementKeys.project(projectId),
    queryFn: async () =>
      (await http.get<RequirementList>(`/projects/${projectId}/requirements`)).data,
    enabled,
  });
}

function useRequirementChange<T>(request: (arg: T) => Promise<Requirement | null>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () =>
      Promise.all(
        REQUIREMENT_CHANGE_REFRESHES.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
}

/** Adds a requirement, or replaces one's text, deadline and assignees when it has an id. */
export function useSaveRequirement(projectId: number, requirementId: number | null) {
  return useRequirementChange(async (body: SaveRequirementBody) => {
    const path = `/projects/${projectId}/requirements`;
    const { data } =
      requirementId == null
        ? await http.post<Requirement>(path, body)
        : await http.put<Requirement>(`${path}/${requirementId}`, body);
    return data;
  });
}

/** Ticks or unticks any requirement of the project. */
export function useTickRequirement(projectId: number) {
  return useRequirementChange(async ({ id, done }: { id: number; done: boolean }) => {
    const { data } = await http.post<Requirement>(
      `/projects/${projectId}/requirements/${id}/${done ? "done" : "undone"}`,
    );
    return data;
  });
}

export function useDeleteRequirement(projectId: number) {
  return useRequirementChange(async (id: number) => {
    await http.delete(`/projects/${projectId}/requirements/${id}`);
    return null;
  });
}
