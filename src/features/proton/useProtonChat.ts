import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toApiError } from "@/api/errors";
import { useCurrentUser } from "@/auth/session";
import {
  fetchSavedChat,
  refreshChats,
  usageKey,
  type AskBody,
  type ProtonChoice,
  type ProtonQuickReplyOption,
} from "./api";
import { cardsOf } from "./cards";
import type { ActionState, ProtonTurn } from "./chat";
import { protonErrorText } from "./errorWords";
import { parseBlocks } from "./figures";
import { readOpenChat, saveOpenChat } from "./openChat";
import type { ProtonPageContext } from "./pageContext";
import { chatOf } from "./savedChat";
import { addDelta, type LiveText } from "./sse";
import { askProton } from "./stream";
import { useCarryOut } from "./useCarryOut";

const STOPPED = "Stopped. Nothing from that answer was kept.";
const ROLLED_OVER = "Our chat was getting long, so I kept a short summary of it and carried on.";

/** What Proton is doing for the question being answered, and the answer as far as it is written. */
export type LiveAnswer = { status: string | null; text: LiveText | null };

type Question = Omit<AskBody, "conversationId" | "page">;

type ChatState = {
  conversationId: string | null;
  turns: ProtonTurn[];
  actions: Record<string, ActionState>;
  /** Why the chat can only be read, not carried on; null when it can be. */
  locked: string | null;
};

const EMPTY: ChatState = { conversationId: null, turns: [], actions: {}, locked: null };

/**
 * Proton's chat: asking (live, with Stop), the turns and the proposals' states. A change a reply proposes happens
 * only when the person presses Confirm on its card. The chat is saved by the API as it goes; this phone keeps only
 * which saved chat was open, and shows it again the next time Proton opens. "New conversation" leaves the chat
 * without deleting it; deleting is its own, explicit action.
 */
export function useProtonChat(page: ProtonPageContext | null) {
  const queryClient = useQueryClient();
  const carryOut = useCarryOut();
  const userId = useCurrentUser().id;
  const [chat, setChat] = useState<ChatState>(EMPTY);
  const [live, setLive] = useState<LiveAnswer | null>(null);
  // A saved chat is being brought back: it is read from the API, and nothing can be asked until it is here.
  const [opening, setOpening] = useState(() => readOpenChat(userId) != null);
  const running = useRef<AbortController | null>(null);
  // Which opening is the latest; an earlier one that arrives late is ignored.
  const latestOpening = useRef(0);

  useEffect(() => () => running.current?.abort(), []);

  const add = (...more: ProtonTurn[]) => setChat((c) => ({ ...c, turns: [...c.turns, ...more] }));

  const cancelRunning = useCallback(() => {
    const controller = running.current;
    running.current = null;
    controller?.abort();
    setLive(null);
  }, []);

  /** Shows a saved chat. Gives the reason when it can't be opened, or null. */
  const open = useCallback(
    async (id: string): Promise<string | null> => {
      const mine = ++latestOpening.current;
      cancelRunning();
      setOpening(true);
      try {
        const saved = await fetchSavedChat(id);
        if (mine !== latestOpening.current) return null;
        setChat(chatOf(saved));
        saveOpenChat(userId, saved.id);
        return null;
      } catch (error) {
        if (mine !== latestOpening.current) return null;
        const failure = toApiError(error);
        // A chat that is gone (deleted, or past its 90 days) is no longer the one to bring back.
        if (failure.status === 404 && readOpenChat(userId) === id) saveOpenChat(userId, null);
        return protonErrorText(failure);
      } finally {
        if (mine === latestOpening.current) setOpening(false);
      }
    },
    [cancelRunning, userId],
  );

  useEffect(() => {
    const id = readOpenChat(userId);
    if (id) void open(id);
  }, [open, userId]);

  async function send(question: Question, id: string | null, retried = false): Promise<void> {
    const controller = new AbortController();
    running.current = controller;
    setLive({ status: null, text: null });
    try {
      const reply = await askProton(
        { conversationId: id, page, ...question },
        {
          onStatus: (status) => setLive((l) => l && { ...l, status }),
          onDelta: (trip, text) =>
            setLive((l) => l && { ...l, text: addDelta(l.text, trip, text) }),
        },
        controller.signal,
      );
      queryClient.setQueryData(usageKey, reply.usage);
      const did = carryOut(reply.uiCommands);
      setChat((c) => ({ ...c, conversationId: reply.conversationId }));
      saveOpenChat(userId, reply.conversationId);
      void refreshChats(queryClient);
      if (reply.rolledOver) add({ from: "note", text: ROLLED_OVER });
      add({
        from: "proton",
        text: reply.reply,
        refs: reply.refs,
        sources: reply.sources,
        cards: cardsOf(reply),
        choices: reply.choices,
        quickReplies: reply.quickReplies,
        suggestions: reply.suggestions,
        did,
        blocks: parseBlocks(reply.blocks),
      });
    } catch (error) {
      // Stop (or leaving the chat, which clears `running`) ends the answer: nothing of it is kept.
      if (controller.signal.aborted) {
        if (running.current === controller) add({ from: "note", text: STOPPED });
        return;
      }
      const failure = toApiError(error);
      if (failure.code === "proton_conversation_ended" && id != null) {
        // The server no longer has the chat: a typed question is asked again in a new one, a button is not.
        setChat((c) => ({ ...c, conversationId: null }));
        saveOpenChat(userId, null);
        if (question.text && !retried) {
          add({ from: "note", text: failure.message });
          await send({ text: question.text }, null, true);
          return;
        }
        add({ from: "error", text: `${failure.message} Could you ask that again?` });
        return;
      }
      add({ from: "error", text: protonErrorText(failure) });
    } finally {
      if (running.current === controller) {
        running.current = null;
        setLive(null);
      }
    }
  }

  function submit(shown: string, question: Question) {
    if (running.current || opening || chat.locked) return;
    add({ from: "you", text: shown });
    void send(question, chat.conversationId);
  }

  return {
    turns: chat.turns,
    conversationId: chat.conversationId,
    locked: chat.locked,
    opening,
    live,
    actions: chat.actions,
    setAction: (id: string, state: ActionState) =>
      setChat((c) => ({ ...c, actions: { ...c.actions, [id]: state } })),
    ask: (text: string) => submit(text, { text }),
    // A button sends only what it is; the API checks it was offered and writes the question itself.
    pick: (choice: ProtonChoice) =>
      submit(choice.label, { choice: { type: choice.type, id: choice.id } }),
    quickReply: (option: ProtonQuickReplyOption) => submit(option.label, { reply: option.reply }),
    suggest: (suggestion: string, index: number) => submit(suggestion, { suggestion: index }),
    stop: () => running.current?.abort(),
    open,
    /** Leaves this chat for a fresh one. The chat stays saved; deleting it is a separate action. */
    startOver: () => {
      latestOpening.current++;
      cancelRunning();
      setOpening(false);
      saveOpenChat(userId, null);
      setChat(EMPTY);
    },
  };
}
