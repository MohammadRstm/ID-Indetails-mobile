import type { Chat } from "./api";

/*
 * The chat on screen right now, so a push for it isn't shown on top of it (phase-0-plan.md section 17).
 */

let open: Chat | null = null;

export function setOpenChat(chat: Chat | null) {
  open = chat;
}

export function openChat(): Chat | null {
  return open;
}
