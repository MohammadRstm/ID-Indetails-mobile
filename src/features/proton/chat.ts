import type {
  ProtonChoice,
  ProtonPendingAction,
  ProtonQuickReplyOption,
  ProtonRef,
  ProtonSource,
} from "./api";

/** Where a proposed change stands in the chat. Only "open" can still be confirmed. */
export type ActionState =
  | { kind: "open" }
  | { kind: "done"; message: string }
  | { kind: "cancelled" }
  | { kind: "failed"; message: string }
  /** The card lost track of its status: it asks the API what became of it, and stays closed until it knows. */
  | { kind: "closed" }
  | { kind: "replaced" }
  | { kind: "expired" };

export type ProtonTurn =
  | { from: "you"; text: string }
  | {
      from: "proton";
      text: string;
      refs: ProtonRef[];
      sources: ProtonSource[];
      /** The changes proposed in this reply, each waiting for its own Confirm. */
      cards: ProtonPendingAction[];
      /** Options to pick from; only the newest reply's can still be picked. */
      choices: ProtonChoice[];
      /** Answers to Proton's own question (a period, yes or no), as buttons; only the newest reply's can be tapped. */
      quickReplies: ProtonQuickReplyOption[];
      /** Things the person might say next; only the newest reply's can be tapped. */
      suggestions: string[];
      /** What the app did for this reply ("Opened Villa Mounir."), if anything. */
      did: string | null;
    }
  /** Something the app says about the chat itself: that an answer was stopped, or the chat was summed up. */
  | { from: "note"; text: string }
  | { from: "error"; text: string };
