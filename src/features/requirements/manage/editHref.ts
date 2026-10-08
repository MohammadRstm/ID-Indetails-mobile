import type { Href } from "expo-router";

/** The requirement editor: adding one to a project, or editing one of its requirements. */
export function editRequirementHref(projectId: number, requirementId?: number): Href {
  const params: Record<string, string> = { projectId: String(projectId) };
  if (requirementId != null) params.id = String(requirementId);
  return { pathname: "/requirements/edit", params } as Href;
}
