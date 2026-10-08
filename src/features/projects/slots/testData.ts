import type { EmployeeSummary, Project, Requirement } from "@/api/types";

/* Records as the API sends them, for Phase 3's tests. */

export function aProject(change: Partial<Project> = {}): Project {
  return {
    id: 7,
    title: "Villa Haddad",
    domain: "design",
    status: "active",
    billingType: "client",
    client: { id: 3, displayName: "Hala Rizk" },
    owner: { id: 2, name: "Nadia Test" },
    description: "Full interior",
    location: "Beirut",
    icon: null,
    tint: null,
    startDate: "2026-09-01",
    targetDate: "2026-12-01",
    progressPct: 40,
    heldSince: null,
    completedAt: null,
    finalizedAt: null,
    createdAt: "2026-09-01T08:00:00Z",
    money: null,
    team: null,
    ...change,
  };
}

export function aRequirement(change: Partial<Requirement> = {}): Requirement {
  return {
    id: 31,
    text: "Concept design approved by the client",
    deadline: "2026-10-20",
    isDone: false,
    isOverdue: false,
    autoDone: false,
    doneAt: null,
    doneBy: null,
    createdAt: "2026-09-02T08:00:00Z",
    assignees: [{ id: 4, name: "Sarah Test" }],
    ...change,
  };
}

export function anEmployee(change: Partial<EmployeeSummary> = {}): EmployeeSummary {
  return {
    id: 4,
    firstName: "Sarah",
    lastName: "Test",
    email: "sarah@hourline.test",
    role: "employee",
    domain: "design",
    status: "active",
    position: "Interior designer",
    team: null,
    online: false,
    lastSeenAt: null,
    joinedOn: "2025-09-01",
    leftOn: null,
    photoFileId: null,
    isJoker: false,
    sessionsRevokedAt: null,
    ...change,
  };
}
