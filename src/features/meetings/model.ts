import type { Meeting } from "@/api/types";
import { companyTimeToUtc, dayKey, minutesOfDay } from "@/format/time";

/*
 * A meeting being set or changed on the phone. The API's rules: at least 5 minutes, starting and ending on the
 * same company day; topic up to 200 characters and description up to 2000, both optional.
 */

export type MeetingDraft = {
  projectId: number | null;
  day: string;
  startMin: number;
  endMin: number;
  topic: string;
  description: string;
};

export function draftOfMeeting(m: Meeting): MeetingDraft {
  return {
    projectId: m.project.id,
    day: dayKey(m.startsAt),
    startMin: minutesOfDay(m.startsAt),
    endMin: minutesOfDay(m.endsAt) || 1440,
    topic: m.topic ?? "",
    description: m.description ?? "",
  };
}

export function meetingProblem(d: MeetingDraft): string | null {
  if (d.projectId == null) return "Pick a project.";
  if (d.endMin <= d.startMin) return "The meeting has to end after it starts, on the same day.";
  if (d.endMin - d.startMin < 5) return "A meeting is at least 5 minutes.";
  if (d.topic.trim().length > 200) return "The topic can be at most 200 characters.";
  if (d.description.trim().length > 2000) return "The description can be at most 2000 characters.";
  return null;
}

export function meetingBody(d: MeetingDraft) {
  return {
    startsAt: companyTimeToUtc(d.day, d.startMin).toISOString(),
    endsAt: companyTimeToUtc(d.day, d.endMin).toISOString(),
    topic: d.topic.trim() || null,
    description: d.description.trim() || null,
  };
}

/** Whether this person may change or remove a meeting: meeting:manage covers any, meeting:create their own. */
export function canChangeMeeting(
  m: Pick<Meeting, "createdBy">,
  me: number,
  can: { manage: boolean; create: boolean },
): boolean {
  return can.manage || (can.create && m.createdBy?.id === me);
}
