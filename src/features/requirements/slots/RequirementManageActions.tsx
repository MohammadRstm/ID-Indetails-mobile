import type { Requirement } from "@/api/types";

export type RequirementManageActionsProps = { projectId: number; requirement: Requirement };

/** Slot: managing a requirement, in each requirement row's menu. Phase 2 renders it; Phase 3 fills it in. */
export function RequirementManageActions(props: RequirementManageActionsProps) {
  return null;
}
