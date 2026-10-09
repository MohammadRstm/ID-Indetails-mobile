import type { ActivityItem } from "@/api/types";

/* Feed events as the API sends them, for the activity tests. */

export function anEvent(change: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 1,
    kind: "project_hold",
    group: "projects",
    domain: "design",
    occurredAt: "2026-10-08T07:00:00Z",
    isDemo: false,
    actor: { id: 2, name: "Nadia Test" },
    project: { id: 7, name: "Villa Haddad" },
    client: null,
    subjectType: "project",
    subjectId: 7,
    amount: null,
    prevAmount: null,
    payload: null,
    workEntry: null,
    ...change,
  };
}

export const page = (items: ActivityItem[], totalCount = items.length) => ({
  items,
  page: 1,
  pageSize: 40,
  totalCount,
});
