import { http } from "@/api/http";
import type { PushData } from "@/api/mobileTypes";
import type { CurrentUser } from "@/api/types";
import { toast } from "@/ui/toast";
import { PUSH_ACTION } from "./categories";

/*
 * A notification's action buttons (categories.ts). The payload comes from outside the app, so it is checked
 * before anything is sent: the ids must be ids, and the push must be for the person signed in now (on a shared
 * phone, someone else's push never acts with this session). When an action can't be done, the caller opens the
 * push's screen instead, so the person can do it there.
 */

const MAX_REPLY_LENGTH = 4000;

const isId = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v > 0;

async function isForSignedInPerson(data: PushData): Promise<boolean> {
  if (!isId(data.forUserId)) return false;
  const { data: me } = await http.get<CurrentUser>("/auth/me");
  return me.id === data.forUserId;
}

async function markDone(data: PushData): Promise<boolean> {
  const target = data.target;
  if (target?.type !== "requirement" || !isId(target.projectId) || !isId(target.requirementId)) {
    return false;
  }
  if (!(await isForSignedInPerson(data))) return false;
  await http.post(`/projects/${target.projectId}/requirements/${target.requirementId}/done`);
  toast({ text: "Requirement marked done", icon: "check" });
  return true;
}

async function reply(data: PushData, userText: string | undefined): Promise<boolean> {
  const target = data.target;
  const body = userText?.trim() ?? "";
  if (target?.type !== "conversation" || !body || body.length > MAX_REPLY_LENGTH) return false;
  const path = isId(target.teamId)
    ? `/messages/teams/${target.teamId}`
    : isId(target.userId)
      ? `/messages/direct/${target.userId}`
      : null;
  if (!path) return false;
  if (!(await isForSignedInPerson(data))) return false;
  await http.post(path, { body });
  toast({ text: "Reply sent", icon: "check" });
  return true;
}

/**
 * Handles a notification's action button. Phase 2 calls it from the response handler, after the app's lock,
 * before opening the target, with the typed text of a reply (`response.userText`). Resolves true when the
 * action was done and nothing should open; false (the screen opens) for a plain tap, an unknown action, a
 * payload that doesn't fit, or a request that failed.
 */
export async function handleNotificationAction(
  actionId: string,
  data: PushData,
  userText?: string,
): Promise<boolean> {
  try {
    if (actionId === PUSH_ACTION.markDone) return await markDone(data);
    if (actionId === PUSH_ACTION.reply) return await reply(data, userText);
    return false;
  } catch {
    toast({
      text: actionId === PUSH_ACTION.reply ? "Couldn't send the reply" : "Couldn't mark it done",
      sub: "Opening it so you can try again.",
      icon: "alert",
    });
    return false;
  }
}
