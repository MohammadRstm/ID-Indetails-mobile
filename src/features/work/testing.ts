// Test data for the work screens' tests. Not used by the app.
import type { MySchedule, WorkEntry } from "@/api/types";
import type { DomainSettings, MyProject } from "./api";

export const designSettings: DomainSettings = {
  allowFutureEntries: false,
  allowOverlap: false,
  autoArchive: false,
  domainCode: "design",
  editWindow: "one_day",
  holdLogging: false,
  logReminder: true,
  notifyEntry: "all",
  notifyIdle: true,
  notifyProject: true,
  requireDescription: true,
  timerEnabled: true,
  updatedAt: null,
  weeklySummary: true,
};

export function myProject(id: number, title: string, change: Partial<MyProject> = {}): MyProject {
  return {
    acceptsWork: true,
    clientName: null,
    contributors: [],
    createdAt: "2026-01-01T00:00:00Z",
    description: null,
    icon: null,
    id,
    lastActivity: null,
    location: null,
    myLastStartedAt: null,
    myMinutes: 0,
    progressPct: 10,
    startDate: "2026-01-01",
    status: "active",
    tint: null,
    title,
    ...change,
  };
}

export function workEntry(
  id: number,
  startedAt: string,
  endedAt: string,
  project = myProject(1, "Villa Haddad"),
): WorkEntry {
  return {
    id,
    startedAt,
    endedAt,
    minutes: Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 60_000),
    overtimeMinutes: 0,
    description: "Drawings",
    canEdit: true,
    commentCount: 0,
    createdAt: endedAt,
    updatedAt: null,
    attachment: null,
    person: { id: 4, name: "Sarah Test" },
    project: { id: project.id, title: project.title, icon: null, tint: null },
  };
}

export function schedule(date: string, change: Partial<MySchedule["day"]> = {}): MySchedule {
  return {
    companyWeek: {
      breakMinutes: 60,
      effectiveFrom: "2026-01-01",
      endMinute: 17 * 60,
      id: 1,
      overtimeMultiplier: 1.5,
      requiredMinutesPerDay: 420,
      requiredMinutesPerWeek: 2100,
      startMinute: 9 * 60,
      workDays: [1, 2, 3, 4, 5],
    },
    day: {
      date,
      endMinute: 17 * 60,
      insideMinutes: 0,
      isWorkingDay: true,
      leftMinutes: 420,
      loggedMinutes: 0,
      monthShortMinutes: null,
      overtimeMinutes: 0,
      paidBreakMinutes: 60,
      requiredMinutes: 420,
      startMinute: 9 * 60,
      ...change,
    },
    schedule: {
      changedOn: null,
      days: [1, 2, 3, 4, 5].map((weekday) => ({
        weekday,
        startMinute: 540,
        endMinute: 1020,
        requiredMinutes: 420,
      })),
      domain: "design",
      isOwn: false,
      name: "Sarah Test",
      nextChangeOn: null,
      ownSince: null,
      photoFileId: null,
      position: null,
      requiredMinutesPerWeek: 2100,
      role: "employee",
      team: null,
      userId: 4,
    },
  };
}
