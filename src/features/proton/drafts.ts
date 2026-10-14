import type { Chat } from "@/features/messages/api";

/*
 * Messages Proton wrote for the person to read and send. A draft waits here, per chat, until that chat opens and
 * takes it into its composer. Nothing is sent: the person presses Send.
 */

const drafts = new Map<string, string>();

const keyOf = (chat: Chat) =>
  chat.kind === "team" ? `team-${chat.teamId}` : `direct-${chat.userId}`;

export function setProtonDraft(chat: Chat, body: string) {
  drafts.set(keyOf(chat), body);
}

/** The draft waiting for this chat, once: asking again gives nothing. */
export function takeProtonDraft(chat: Chat): string | null {
  const key = keyOf(chat);
  const body = drafts.get(key) ?? null;
  drafts.delete(key);
  return body;
}
