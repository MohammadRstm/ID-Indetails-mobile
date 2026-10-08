import Storage from "expo-sqlite/kv-store";
import { companyToday, fmtDurShort } from "@/format/time";

/*
 * What the home-screen widgets show: today's hours, from a small cache the app writes whenever it learns
 * them. A widget never calls the API and never holds a token; it only reads this cache. The cache holds
 * minutes and a day, nothing personal.
 */

export type TodaySnapshot = {
  /** The company day the minutes belong to ("yyyy-MM-dd"). */
  day: string;
  minutes: number;
  timerRunning: boolean;
};

/** The widget's screen links. Links only open screens (phase-0-plan.md section 9). */
export const WIDGET_LINKS = {
  startTimer: "idindetails://today",
  logWork: "idindetails://log-work",
  addMaterials: "idindetails://materials/add",
} as const;

/** What a widget draws, already worded. */
export type TodayWidgetView = {
  hours: string;
  caption: string;
  timerRunning: boolean;
};

export const ANDROID_WIDGET_NAME = "TodayHours";

const CACHE_KEY = "widgets.today";

/** The widget's text for a snapshot; a snapshot from an earlier day or no snapshot asks to open the app. */
export function shapeTodayView(
  snapshot: TodaySnapshot | null,
  now: Date = new Date(),
): TodayWidgetView {
  if (!snapshot || snapshot.day !== companyToday(now)) {
    return { hours: "--", caption: "Open the app to refresh", timerRunning: false };
  }
  return {
    hours: snapshot.minutes > 0 ? fmtDurShort(snapshot.minutes) : "0h",
    caption: snapshot.timerRunning ? "Today, timer running" : "Today",
    timerRunning: snapshot.timerRunning,
  };
}

function isSnapshot(value: unknown): value is TodaySnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.day) &&
    typeof v.minutes === "number" &&
    Number.isFinite(v.minutes) &&
    v.minutes >= 0 &&
    typeof v.timerRunning === "boolean"
  );
}

export async function readTodaySnapshot(): Promise<TodaySnapshot | null> {
  try {
    const raw = await Storage.getItem(CACHE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isSnapshot(value) ? value : null;
  } catch {
    return null;
  }
}

export async function writeTodaySnapshot(snapshot: TodaySnapshot): Promise<void> {
  await Storage.setItem(CACHE_KEY, JSON.stringify(snapshot));
}

/** Signing out must not leave someone's hours on the home screen. */
export async function clearTodaySnapshot(): Promise<void> {
  await Storage.removeItem(CACHE_KEY);
}
