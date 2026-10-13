import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toApiError } from "@/api/errors";
import {
  useEndConversation,
  usageKey,
  type AskBody,
  type ProtonChoice,
  type ProtonQuickReplyOption,
} from "./api";
import { cardsOf } from "./cards";
import type { ActionState, ProtonTurn } from "./chat";
import { protonErrorText } from "./errorWords";
import type { ProtonPageContext } from "./pageContext";
import { addDelta, type LiveText } from "./sse";
import { askProton } from "./stream";
import { useCarryOut } from "./useCarryOut";

const STOPPED = "Stopped. Nothing from that answer was kept.";
const ROLLED_OVER = "Our chat was getting long, so I kept a short summary of it and carried on.";

/** What Proton is doing for the question being answered, and the answer as far as it is written. */
export type LiveAnswer = { status: string | null; text: LiveText | null };

type Question = Omit<AskBody, "conversationId" | "page">;

/**
 * Proton's chat: asking (live, with Stop), the turns and the proposals' states. A change a reply proposes happens
 * only when the person presses Confirm on its card. The chat lives as long as the screen does.
 */
export function useProtonChat(page: ProtonPageContext | null) {
  const queryClient = useQueryClient();
  const carryOut = useCarryOut();
  const end = useEndConversation();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ProtonTurn[]>([]);
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [live, setLive] = useState<LiveAnswer | null>(null);
  const running = useRef<AbortController | null>(null);

  useEffect(() => () => running.current?.abort(), []);

  const add = (...more: ProtonTurn[]) => setTurns((t) => [...t, ...more]);

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
      setConversationId(reply.conversationId);
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
      });
    } catch (error) {
      // Stop (or a new chat, which clears `running`) ends the answer: nothing of it is kept.
      if (controller.signal.aborted) {
        if (running.current === controller) add({ from: "note", text: STOPPED });
        return;
      }
      const failure = toApiError(error);
      if (failure.code === "proton_conversation_ended" && id != null) {
        // The server no longer has the chat: a typed question is asked again in a new one, a button is not.
        setConversationId(null);
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
    if (running.current) return;
    add({ from: "you", text: shown });
    void send(question, conversationId);
  }

  return {
    turns,
    conversationId,
    live,
    actions,
    setAction: (id: string, state: ActionState) => setActions((a) => ({ ...a, [id]: state })),
    ask: (text: string) => submit(text, { text }),
    // A button sends only what it is; the API checks it was offered and writes the question itself.
    pick: (choice: ProtonChoice) =>
      submit(choice.label, { choice: { type: choice.type, id: choice.id } }),
    quickReply: (option: ProtonQuickReplyOption) => submit(option.label, { reply: option.reply }),
    suggest: (suggestion: string, index: number) => submit(suggestion, { suggestion: index }),
    stop: () => running.current?.abort(),
    startOver: () => {
      const controller = running.current;
      running.current = null;
      controller?.abort();
      setLive(null);
      if (conversationId) end.mutate(conversationId);
      setConversationId(null);
      setTurns([]);
      setActions({});
    },
  };
}
