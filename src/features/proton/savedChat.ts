// Ported from the web client: src/domains/shared/proton/protonChat.ts, chatOf (see docs/ported-from-web.md).
import type { ProtonSavedChat } from "./api";
import type { ActionState, ProtonTurn } from "./chat";
import { parseBlocks } from "./figures";

/** A saved chat as the screen shows one. */
export type OpenedChat = {
  conversationId: string;
  turns: ProtonTurn[];
  actions: Record<string, ActionState>;
  /** Why the chat can only be read, not carried on; null when questions can still be asked in it. */
  locked: string | null;
};

const ACCESS_CHANGED =
  "Your access changed since this chat, so it can't be carried on. Start a new chat to ask more.";

type StoredCard = ProtonSavedChat["messages"][number]["cards"][number];

/** What became of a card, as the chat shows it. A card still waiting can be confirmed only in a chat that goes on. */
function stateOfStored({ status, message }: StoredCard, canContinue: boolean): ActionState {
  switch (status) {
    case "pending":
      return canContinue ? { kind: "open" } : { kind: "closed" };
    case "succeeded":
      return { kind: "done", message: message ?? "Done." };
    case "failed":
      return { kind: "failed", message: message ?? "It couldn't be done." };
    case "cancelled":
      return { kind: "cancelled" };
    case "superseded":
      return { kind: "replaced" };
    case "expired":
      return { kind: "expired" };
    case "executing":
      return { kind: "closed" };
  }
}

/** A saved chat's messages as turns, each card with the status the API stored, and why it is locked if it is. */
export function chatOf(saved: ProtonSavedChat): OpenedChat {
  const actions: Record<string, ActionState> = {};
  const turns = saved.messages.map((m): ProtonTurn => {
    if (m.role === "user") return { from: "you", text: m.text };
    for (const stored of m.cards) {
      actions[stored.card.id] = stateOfStored(stored, saved.canContinue);
    }
    return {
      from: "proton",
      text: m.text,
      refs: m.refs,
      sources: m.sources,
      cards: m.cards.map((c) => c.card),
      choices: [],
      quickReplies: [],
      suggestions: [],
      did: null,
      blocks: parseBlocks(m.blocks),
    };
  });
  const locked = saved.hidden ?? (saved.canContinue ? null : ACCESS_CHANGED);
  return { conversationId: saved.id, turns, actions, locked };
}
