import type { CalendarEvent } from "./AddToCalendarButton";

/*
 * Turning an app event into what the phone's calendar stores. Times from the API are instants and stay those
 * instants; an all-day deadline is a date in the company's time zone and stays that date on the phone, whatever
 * zone the phone is in.
 */

export const APP_CALENDAR_TITLE = "ID InDetails";

export type CalendarPlatform = "ios" | "android";

export type EventDetails = {
  title: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  /** Left out for an all-day event on iOS, which keeps all-day dates floating. */
  timeZone?: string;
  notes?: string;
};

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

type DayParts = { year: number; month: number; day: number };

/** The company day an instant falls on, or the day itself when it is already a "yyyy-MM-dd" date. */
export function companyDayOf(value: string, timeZone: string): DayParts | null {
  const key = DAY.exec(value);
  if (key) return { year: +key[1], month: +key[2] - 1, day: +key[3] };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts: Record<string, number> = {};
  for (const part of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date)) {
    if (part.type !== "literal") parts[part.type] = +part.value;
  }
  return { year: parts.year, month: parts.month - 1, day: parts.day };
}

/**
 * The midnight that starts a calendar day, as each platform stores all-day events: Android's calendar wants
 * UTC midnight (with the UTC zone), iOS the phone's own midnight (a floating date).
 */
function midnight(day: DayParts, platform: CalendarPlatform, offsetDays = 0): Date {
  return platform === "android"
    ? new Date(Date.UTC(day.year, day.month, day.day + offsetDays))
    : new Date(day.year, day.month, day.day + offsetDays);
}

function compareDays(a: DayParts, b: DayParts): number {
  return a.year - b.year || a.month - b.month || a.day - b.day;
}

/** What to store for the event on this platform, or null when its start isn't a date or time. */
export function toEventDetails(
  event: CalendarEvent,
  platform: CalendarPlatform,
  companyTimeZone: string,
): EventDetails | null {
  const notes = event.notes?.trim() || undefined;

  if (event.allDay) {
    const first = companyDayOf(event.startsAt, companyTimeZone);
    if (!first) return null;
    const lastAsked = event.endsAt ? companyDayOf(event.endsAt, companyTimeZone) : null;
    const last = lastAsked && compareDays(lastAsked, first) > 0 ? lastAsked : first;
    return {
      title: event.title,
      startDate: midnight(first, platform),
      // The end is exclusive: the midnight after the last day.
      endDate: midnight(last, platform, 1),
      allDay: true,
      timeZone: platform === "android" ? "UTC" : undefined,
      notes,
    };
  }

  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return null;
  const end = event.endsAt ? new Date(event.endsAt) : start;
  return {
    title: event.title,
    startDate: start,
    endDate: Number.isNaN(end.getTime()) || end < start ? start : end,
    allDay: false,
    timeZone: companyTimeZone,
    notes,
  };
}

export type CalendarSummary = {
  id: string;
  title: string;
  allowsModifications: boolean;
  isPrimary?: boolean;
};

/**
 * Where an Android event goes: the phone's primary calendar that takes events (it syncs with the person's
 * account), else an "ID InDetails" calendar made earlier, else any that takes events, else a new local one.
 */
export function chooseAndroidCalendar(calendars: CalendarSummary[]): string | "create" {
  const writable = calendars.filter((c) => c.allowsModifications);
  const chosen =
    writable.find((c) => c.isPrimary) ??
    writable.find((c) => c.title === APP_CALENDAR_TITLE) ??
    writable[0];
  return chosen ? chosen.id : "create";
}
