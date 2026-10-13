import type { Conversation, Message } from "@/api/types";
import type { Chat } from "./api";

/*
 * Pure helpers for chats, ported from the web (src/domains/shared/messages/messageText.ts).
 */

export const MAX_ATTACHMENTS = 10;
export const MAX_MESSAGE = 4000;
/** Read out with the "with Proton" mark: touch has no tooltip, as on the web. */
export const VIA_PROTON_LABEL = "Written with Proton and sent after the sender confirmed it";
/** Above this, a video on mobile data gets a warning first. */
export const LARGE_VIDEO_BYTES = 20 * 1024 * 1024;

/** What a message says in a list: its text, or what it carries. */
export function snippet(m: Message | null | undefined): string {
  if (!m) return "";
  if (m.kind === "task_comment") return `Task comment${m.body ? `: ${m.body}` : ""}`;
  if (m.body) return m.body;
  const first = m.attachments[0];
  if (!first) return "";
  return first.kind === "video" || first.mimeType.startsWith("video/") ? "Video" : "Photo";
}

/** A message's text cut where its mentions are, so "@Sarah Haddad" can stand out. */
export function mentionParts(text: string, names: string[]): { text: string; mention: boolean }[] {
  if (!names.length) return [{ text, mention: false }];
  const escaped = [...names]
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`@(?:${escaped.join("|")})`, "g");
  const out: { text: string; mention: boolean }[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const index = m.index ?? 0;
    if (index > at) out.push({ text: text.slice(at, index), mention: false });
    out.push({ text: m[0], mention: true });
    at = index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at), mention: false });
  return out;
}

/** A message starts a new run unless the same person wrote the one before within five minutes. */
export function startsRun(m: Message, prev: Message | undefined): boolean {
  return (
    !prev ||
    prev.sender.id !== m.sender.id ||
    prev.kind === "task_comment" ||
    m.kind === "task_comment" ||
    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60_000
  );
}

/** The "@name" being typed at the end of the text, or null when none is. */
export function mentionQuery(text: string): string | null {
  const m = /@([^\s@]*)$/.exec(text);
  return m ? m[1] : null;
}

/** The text with the "@name" being typed replaced by the picked person's full name. */
export function insertMention(text: string, name: string): string {
  return text.replace(/@([^\s@]*)$/, `@${name} `);
}

/** The ids of the picked people still mentioned in the text when it is sent. */
export function mentionIds(text: string, picked: { id: number; name: string }[]): number[] {
  return [...new Set(picked.filter((p) => text.includes(`@${p.name}`)).map((p) => p.id))];
}

/** The chat a conversation is. */
export function chatOf(c: Conversation): Chat | null {
  if (c.type === "group" && c.team) return { kind: "team", teamId: c.team.id };
  if (c.person) return { kind: "direct", userId: c.person.id };
  return null;
}

export function sameChat(a: Chat | null, b: Chat | null): boolean {
  if (!a || !b || a.kind !== b.kind) return false;
  return a.kind === "team"
    ? a.teamId === (b as typeof a).teamId
    : a.userId === (b as typeof a).userId;
}
