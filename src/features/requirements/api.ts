import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/api/http";
import type { MyRequirements, Requirement, Schemas } from "@/api/types";

/*
 * Requirements: the ones assigned to the signed-in person, a project's list, and ticking one off. Adding, editing
 * and removing them is the admin's (Phase 3, requirements/manage).
 */

export type RequirementList = Schemas["RequirementListResponse"];

export const requirementKeys = {
  all: ["requirements"] as const,
  mine: ["requirements", "mine"] as const,
  project: (projectId: number) => ["requirements", "project", projectId] as const,
};

/** The person's open requirements on active and on-hold projects, soonest deadline first. */
export function useMyRequirements(enabled = true) {
  return useQuery({
    queryKey: requirementKeys.mine,
    queryFn: async () => (await http.get<MyRequirements>("/me/requirements")).data,
    enabled,
  });
}

export function useProjectRequirements(projectId: number, enabled = true) {
  return useQuery({
    queryKey: requirementKeys.project(projectId),
    queryFn: async () =>
      (await http.get<RequirementList>(`/projects/${projectId}/requirements`)).data,
    enabled,
  });
}

/** Ticks a requirement done or open again; the project's progress follows, so projects reload too. */
export function useTickRequirement(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, done }: { id: number; done: boolean }) =>
      (
        await http.post<Requirement>(
          `/projects/${projectId}/requirements/${id}/${done ? "done" : "undone"}`,
        )
      ).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      void queryClient.invalidateQueries({ queryKey: ["work", "projects"] });
    },
  });
}
