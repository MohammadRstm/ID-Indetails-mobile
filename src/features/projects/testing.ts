// Test data for the project screens' tests. Not used by the app.
import type { Project, Requirement } from "@/api/types";

export function project(
  id: number,
  domain: "design" | "execution",
  change: Partial<Project> = {},
): Project {
  return {
    billingType: "fixed",
    client: { id: 3, displayName: "Haddad family" },
    completedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    description: null,
    domain,
    finalizedAt: null,
    heldSince: null,
    icon: null,
    id,
    location: "Faqra",
    money: null,
    owner: { id: 2, name: "Nadia Test" },
    progressPct: 40,
    startDate: "2026-01-05",
    status: "active",
    targetDate: null,
    team: null,
    tint: null,
    title: domain === "execution" ? "Faqra chalet" : "Villa Haddad",
    ...change,
  } as Project;
}

export function requirement(id: number, change: Partial<Requirement> = {}): Requirement {
  return {
    assignees: [],
    autoDone: false,
    createdAt: "2026-09-01T00:00:00Z",
    deadline: null,
    doneAt: null,
    doneBy: null,
    id,
    isDone: false,
    isOverdue: false,
    text: `Requirement ${id}`,
    ...change,
  };
}
