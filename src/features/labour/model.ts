import type { LabourWeek } from "@/api/types";
import type { LabourDay, LabourRecord } from "@/offline/model";

/*
 * A labour week being edited on the phone. It starts from what the person already saved on the phone and hasn't
 * been sent, otherwise from the week the API gave (reported, or filled in from the defaults).
 */

export type WeekDraft = { days: LabourDay[]; note: string; expectedVersion: string };

export function draftFromWeek(week: LabourWeek, pending: LabourRecord | undefined): WeekDraft {
  if (pending) {
    return {
      days: pending.payload.days,
      note: pending.payload.note ?? "",
      expectedVersion: pending.payload.expectedVersion,
    };
  }
  return {
    days: week.days.map((d) => ({ date: d.date, workers: d.workers, dailyPay: d.dailyPay })),
    note: week.note ?? "",
    expectedVersion: week.version,
  };
}

/** What stops the week from being saved, in words; null when it can be. */
export function weekProblem(draft: WeekDraft): string | null {
  if (draft.days.some((d) => !Number.isInteger(d.workers) || d.workers < 0)) {
    return "Workers must be a whole number, 0 or more.";
  }
  if (draft.days.some((d) => d.dailyPay < 0)) return "Daily pay can't be negative.";
  if (draft.note.length > 2000) return "The note can be at most 2000 characters.";
  return null;
}

/** Whether two versions of a week say the same (the server saves nothing for an identical one). */
export function sameWeek(
  a: { days: LabourDay[]; note: string | null },
  b: { days: LabourDay[]; note: string | null },
): boolean {
  const key = (w: { days: LabourDay[]; note: string | null }) =>
    JSON.stringify({
      days: [...w.days]
        .sort((x, y) => x.date.localeCompare(y.date))
        .map((d) => [d.date, d.workers, d.dailyPay]),
      note: (w.note ?? "").trim(),
    });
  return key(a) === key(b);
}
