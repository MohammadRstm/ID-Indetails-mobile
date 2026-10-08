import type { ApiError } from "@/api/errors";
import type { OvertimePreview, Schemas, WorkEntry } from "@/api/types";
import {
  addDays,
  companyTimeToUtc,
  DAYS,
  dayKey,
  fmtDur,
  fmtH,
  fmtHourLabel,
  fmtMinutes,
  fmtRange,
  fmtTime,
  minutesOfDay,
  partsOf,
} from "@/format/time";
import type { BadgeTone } from "@/ui";
import type { WeekDay } from "@/ui/charts";
import type { MyProject } from "./api";

/*
 * A working day as minutes after midnight in company time, and the rules the log-work sheet checks before
 * saving, ported from the web (src/domains/design/work/day.ts and overtime.ts). They only stop an obviously
 * wrong save early: the API checks everything again, and what counts as overtime always comes from it.
 */

export const DAY = 1440;
/** The shortest entry the API takes, in minutes. */
export const MIN_ENTRY = 5;
/** The longest entry the API takes, in minutes. */
export const MAX_ENTRY = 16 * 60;
/** Where a day starts when the schedule doesn't say (9 AM). */
export const DEFAULT_START = 9 * 60;

export type Span = { s: number; e: number };

/** How long a run from one clock time to another is; an end before the start is on the next day. */
export function durationOf(startMin: number, endMin: number): number {
  return (((endMin - startMin) % DAY) + DAY) % DAY;
}

/** An entry as minutes of `day`, clipped to it. */
export function spanOn(entry: { startedAt: string; endedAt: string }, day: string): Span {
  const s = dayKey(entry.startedAt) === day ? minutesOfDay(entry.startedAt) : 0;
  const e = dayKey(entry.endedAt) === day ? minutesOfDay(entry.endedAt) : DAY;
  return { s, e: e || DAY };
}

/** The UTC instant of minute `m` of `day`, as the API takes it (minutes past 1440 run into the next day). */
export function isoAt(day: string, minute: number): string {
  return companyTimeToUtc(day, minute).toISOString();
}

/**
 * Where a new log starts when nothing says otherwise: right after the day's last entry (the start of the working
 * day on an empty day), an hour long, or up to now.
 */
export function defaultSlot(
  spans: Span[],
  dayStart: number,
  isToday: boolean,
  nowMin: number,
): { s: number; d: number } {
  const last = spans.length ? Math.max(...spans.map((sp) => sp.e)) : dayStart;
  const start = Math.max(last, 0);
  const room = isToday ? nowMin - start : 60;
  // Rounded down, so a log that runs up to now never ends in the future.
  return { s: start, d: room >= 5 ? Math.min(60, Math.floor(room / 5) * 5) : 60 };
}

/** The projects that take new work, the ones last worked on first (and an edited entry's own). */
export function loggableProjects(projects: MyProject[], keepId?: number): MyProject[] {
  return projects
    .filter((p) => p.acceptsWork || p.id === keepId)
    .sort(
      (a, b) =>
        (b.myLastStartedAt ?? "").localeCompare(a.myLastStartedAt ?? "") ||
        a.title.localeCompare(b.title),
    );
}

type LogCheck = {
  projectId: number | null;
  day: string;
  startMin: number;
  duration: number;
  /** The day's other entries. */
  others: Pick<WorkEntry, "id" | "startedAt" | "endedAt" | "project">[];
  /** The entry being edited, left out of the overlap check. */
  ignoreId?: number | null;
  allowFuture: boolean;
  allowOverlap: boolean;
  now?: Date;
};

/** What stops a log from being saved, in the web's words; null when nothing does. */
export function checkLog(o: LogCheck): string | null {
  const start = companyTimeToUtc(o.day, o.startMin);
  const end = new Date(start.getTime() + o.duration * 60_000);
  const now = o.now ?? new Date();
  if (!o.projectId) return "Pick a project.";
  if (o.duration < MIN_ENTRY) return `An entry needs to be at least ${MIN_ENTRY} minutes.`;
  if (o.duration > MAX_ENTRY) return "An entry can be at most 16 hours.";
  if (end > now && !o.allowFuture) {
    return `That ends in the future. Work can only be logged up to ${fmtTime(now)} today.`;
  }
  if (o.allowOverlap) return null;
  const clash = o.others
    .filter((e) => e.id !== o.ignoreId)
    .find((e) => new Date(e.startedAt) < end && new Date(e.endedAt) > start);
  return clash
    ? `This overlaps your entry ${fmtRange(clash.startedAt, clash.endedAt)} (${clash.project.title}).`
    : null;
}

/** The saved entry a log matches: same project, start and end. Used when a log's answer was lost. */
export function findSameEntry(
  entries: WorkEntry[],
  body: { projectId: number; startedAt: string; endedAt: string },
): WorkEntry | null {
  const start = Date.parse(body.startedAt);
  const end = Date.parse(body.endedAt);
  return (
    entries.find(
      (e) =>
        e.project.id === body.projectId &&
        Date.parse(e.startedAt) === start &&
        Date.parse(e.endedAt) === end,
    ) ?? null
  );
}

/** The API's refusals of a log, edit or delete, in words; anything else keeps the API's own safe message. */
export function workErrorText(error: ApiError): string {
  switch (error.code) {
    case "entry_overlaps":
      return "This overlaps another of your entries.";
    case "edit_window_closed":
      return "This entry can't be changed any more: the time allowed for changes has passed.";
    case "month_closed":
      return "That month is closed, so its work can't change.";
    case "project_not_accepting_work":
      return "This project isn't taking new work right now.";
    case "entry_in_future":
      return "Work can only be logged up to now.";
    case "description_required":
      return "Say what you worked on.";
    case "network_error":
      return "You're offline. Logging work needs a connection.";
    default:
      return error.message;
  }
}

type ScheduleDay = Schemas["MyScheduleDayResponse"];

/** The working hours a schedule sets on a day; null on a day off. */
export function workHoursOf(day: ScheduleDay | null | undefined): Span | null {
  return day && day.isWorkingDay && day.startMinute != null && day.endMinute != null
    ? { s: day.startMinute, e: day.endMinute }
    : null;
}

const clock = (m: number) => (m % 60 === 0 ? fmtHourLabel(m) : fmtMinutes(m));

/** "9 AM – 5 PM", or "a day off". */
export const hoursText = (hours: Span | null) =>
  hours ? `${clock(hours.s)} – ${clock(hours.e)}` : "a day off";

/** "2h overtime (outside 9 AM – 5 PM)", from the API's preview; null when none of it is overtime. */
export function overtimeTag(p: OvertimePreview): string | null {
  const ot = p.overtimeMinutes;
  if (!ot) return null;
  if (p.dayOff) return `Day off: all ${fmtDur(ot)} is overtime`;
  const hours =
    p.dayStartMinute == null || p.dayEndMinute == null
      ? null
      : { s: p.dayStartMinute, e: p.dayEndMinute };
  const req = fmtH(p.requiredMinutes ?? 0);
  const over = p.pastRequiredMinutes;
  const outside = p.beforeHoursMinutes + p.afterHoursMinutes;
  const why =
    over && !outside
      ? `past your ${req} today`
      : over
        ? `outside ${hoursText(hours)} and past your ${req}`
        : `outside ${hoursText(hours)}`;
  return `${fmtDur(ot)} overtime (${why})`;
}

/** The days a log can be put on from the sheet: today and the six before it, newest first. */
export function recentDays(today: string, count = 7): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, -i));
}

/** Entries grouped by the company day they start on, newest day first, keeping their order inside a day. */
export function groupByDay<T extends { startedAt: string }>(
  entries: T[],
): { day: string; entries: T[] }[] {
  const groups: { day: string; entries: T[] }[] = [];
  for (const entry of entries) {
    const day = dayKey(entry.startedAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}

type DayTotal = { day: string; minutes: number };
type ScheduleWeekday = { weekday: number; requiredMinutes: number };

/** The week's columns: each day's logged minutes and what the person's schedule asks of it. */
export function weekColumns(
  week: DayTotal[],
  scheduleDays: ScheduleWeekday[],
  today: string,
): WeekDay[] {
  return week.map(({ day, minutes }) => {
    const weekday = partsOf(day).weekday;
    return {
      key: day,
      label: DAYS[weekday],
      minutes,
      targetMinutes: scheduleDays.find((d) => d.weekday === weekday)?.requiredMinutes ?? null,
      today: day === today,
    };
  });
}

type LedgerStatus = Schemas["LedgerStatus"];

/** How a month of the hours balance stands, in words and the web's badge colours. */
export const LEDGER_STATUS: Record<LedgerStatus, { label: string; tone: BadgeTone }> = {
  complete: { label: "Complete", tone: "ok" },
  on_track: { label: "On track", tone: "accent" },
  behind: { label: "Behind", tone: "warn" },
  short: { label: "Short", tone: "now" },
  excused: { label: "Excused", tone: "done" },
};
