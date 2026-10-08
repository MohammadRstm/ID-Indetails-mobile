import { dayKey, minutesOfDay } from "@/format/time";

/*
 * The timer is a start time, not a running process (phase-0-plan.md section 16): the running time is always now
 * minus the start, so it survives the app being killed and the phone restarting.
 */

/** A running timer, saved on the phone as soon as it starts. Times are UTC ISO strings. */
export type RunningTimer = {
  userId: number;
  projectId: number;
  projectTitle: string;
  description: string;
  startedAt: string;
};

/** A stopped run not logged yet: it stays as a "time to log" card until it is logged or discarded. */
export type StoppedRun = {
  id: string;
  projectId: number;
  projectTitle: string;
  description: string;
  startedAt: string;
  stoppedAt: string;
};

export type TimerState = { running: RunningTimer | null; stopped: StoppedRun[] };

export const EMPTY_TIMER: TimerState = { running: null, stopped: [] };

/** "Your timer is still running" after this long. */
export const REMIND_AFTER_MS = 4 * 60 * 60_000;

const ENTRY_MIN = 5;
/** What the server accepts as one entry. */
const ENTRY_MAX = 16 * 60;

/** Milliseconds the timer has run, never negative (a phone clock set back). */
export function elapsedMs(startedAt: string, now: number): number {
  return Math.max(0, now - Date.parse(startedAt));
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The ticking display: "0:42" under an hour as minutes and seconds, then "1:05:09". */
export function fmtElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** What the log sheet opens with for a stopped run. */
export type LogSlot = {
  date: string;
  startMin: number;
  /** Minutes after the start day's midnight; past 1440 means it ends the next day. */
  endMin: number;
  /** Set when the run was shorter than an entry's 5 minutes: how long it really ran. */
  shortTimer?: number;
};

/**
 * The entry a run becomes, as on the web (timer.ts): the clock minutes from the one it started in to the one it
 * stopped in (2:50:40 to 2:56:10 is 2:50 to 2:56), at least 5 minutes and at most 16 hours, on the day and at
 * the minute it started, so a run past midnight keeps its evening part.
 */
export function logSlotOf(run: Pick<StoppedRun, "startedAt" | "stoppedAt">): LogSlot {
  const ran =
    Math.floor(Date.parse(run.stoppedAt) / 60_000) - Math.floor(Date.parse(run.startedAt) / 60_000);
  const minutes = Math.min(ENTRY_MAX, Math.max(ENTRY_MIN, ran));
  const startMin = minutesOfDay(run.startedAt);
  return {
    date: dayKey(run.startedAt),
    startMin,
    endMin: startMin + minutes,
    shortTimer: ran < ENTRY_MIN ? Math.max(0, ran) : undefined,
  };
}

/** Reads a saved timer state; anything malformed reads as no timer rather than breaking the app. */
export function parseTimerState(raw: string | null, userId: number): TimerState {
  if (!raw) return EMPTY_TIMER;
  try {
    const value = JSON.parse(raw) as Partial<TimerState>;
    const running =
      value.running &&
      value.running.userId === userId &&
      typeof value.running.projectId === "number" &&
      !Number.isNaN(Date.parse(value.running.startedAt))
        ? value.running
        : null;
    const stopped = Array.isArray(value.stopped)
      ? value.stopped.filter(
          (run) =>
            typeof run?.id === "string" &&
            typeof run.projectId === "number" &&
            !Number.isNaN(Date.parse(run.startedAt)) &&
            !Number.isNaN(Date.parse(run.stoppedAt)),
        )
      : [];
    return { running, stopped };
  } catch {
    return EMPTY_TIMER;
  }
}
