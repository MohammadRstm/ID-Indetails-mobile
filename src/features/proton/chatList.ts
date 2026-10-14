import { relTime } from "@/format/time";
import type { ProtonChatSummary } from "./api";

export type ChatRowData = { id: string; title: string; subtitle: string };

const UNTITLED = "Untitled chat";

/** The saved chats as list rows: the name, and when it was last used with how many messages it holds. */
export function chatRows(chats: ProtonChatSummary[], now: Date = new Date()): ChatRowData[] {
  return chats.map((chat) => {
    const length = `${chat.messageCount} ${chat.messageCount === 1 ? "message" : "messages"}`;
    return {
      id: chat.id,
      title: chat.title.trim() || UNTITLED,
      subtitle: `${relTime(chat.updatedAt, now)} · ${length}`,
    };
  });
}

/** The words for a list with nothing in it. */
export const emptyChatsText = (searching: boolean) =>
  searching ? "No chat has that in its name." : "Your chats with Proton will be kept here.";
