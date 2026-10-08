import type { QueryKey } from "@tanstack/react-query";
import { z } from "zod";
import type { PushData, PushTarget } from "@/api/mobileTypes";

/*
 * What a push carries and what the app does with it (docs/contracts.md section 3), as pure functions. A payload
 * is never trusted: it is checked here, and its target again by routeForTarget before anything opens.
 */

const pushDataSchema = z.object({
  forUserId: z.number().int().positive(),
  kind: z.string().min(1).max(60),
  notificationId: z.number().int().positive().optional(),
  target: z.looseObject({ type: z.string() }),
});

/** The push's data when it is well formed; null otherwise. */
export function parsePushData(raw: unknown): PushData | null {
  const parsed = pushDataSchema.safeParse(raw);
  return parsed.success ? (parsed.data as PushData) : null;
}

/** A push meant for someone else (a shared phone, a stale registration) is ignored. */
export function isForMe(data: PushData, userId: number): boolean {
  return data.forUserId === userId;
}

export type OpenChat = { kind: "team"; teamId: number } | { kind: "direct"; userId: number };

/** A message push for the chat already on screen isn't shown: the chat shows it. */
export function isForOpenChat(data: PushData, chat: OpenChat | null): boolean {
  if (data.kind !== "message" || !chat || data.target.type !== "conversation") return false;
  const target = data.target as Extract<PushTarget, { type: "conversation" }>;
  return chat.kind === "team" ? target.teamId === chat.teamId : target.userId === chat.userId;
}

/** The queries a push says are out of date, so what is on screen reloads. */
export function staleQueries(data: PushData): QueryKey[] {
  if (data.kind === "message") return [["messages"]];
  const keys: QueryKey[] = [["notifications"]];
  const kind = data.kind;
  if (kind.startsWith("requirement")) keys.push(["requirements"], ["projects"]);
  else if (kind === "materials_added") keys.push(["materials"], ["projects"]);
  else if (kind.startsWith("labour_week")) keys.push(["labour"], ["projects"]);
  else if (kind === "meeting_scheduled") keys.push(["meetings"]);
  else if (kind.startsWith("project_")) keys.push(["projects"]);
  else if (
    [
      "work_logged",
      "work_digest",
      "entry_comment",
      "weekly_summary",
      "hours_excused",
      "schedule_changed",
    ].includes(kind)
  ) {
    keys.push(["work"]);
  }
  return keys;
}
