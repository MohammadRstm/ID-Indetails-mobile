import type { Requirement } from "@/api/types";

/*
 * Who may tick a requirement, as on the web (Requirements.tsx): managers any, while the project is open;
 * people with requirement:complete_own the ones assigned to them, and only undo what they ticked themselves.
 */
export function canTick(
  r: Requirement,
  me: number,
  can: { manage: boolean; completeOwn: boolean; projectOpen: boolean },
): boolean {
  if (!can.projectOpen) return false;
  if (can.manage) return true;
  const mine = r.assignees.some((a) => a.id === me);
  return can.completeOwn && mine && (!r.isDone || r.doneBy?.id === me);
}

/** Open ones first (overdue, then by deadline, then without one), then the done ones, latest first. */
export function orderRequirements(items: Requirement[]): Requirement[] {
  const open = items
    .filter((r) => !r.isDone)
    .sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline || b.deadline) return a.deadline ? -1 : 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  const done = items
    .filter((r) => r.isDone)
    .sort((a, b) => (b.doneAt ?? "").localeCompare(a.doneAt ?? ""));
  return [...open, ...done];
}
