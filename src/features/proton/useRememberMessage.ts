import { useState } from "react";
import { toApiError } from "@/api/errors";
import { useRemember } from "./api";
import { rememberErrorText } from "./errorWords";

const REMEMBERED = "I'll remember that.";

/** A message of the person's own that "Remember this" was asked about. */
export type RememberTarget = { index: number; text: string };

/**
 * "Remember this" on one of the person's own messages: it asks first (a long press is easy to do by accident),
 * then the API decides whether it may be kept, and the answer is said under the message.
 */
export function useRememberMessage(conversationId: string | null) {
  const remember = useRemember();
  const [target, setTarget] = useState<RememberTarget | null>(null);
  // What became of each message, by chat and place in it, so another chat's messages never show this one's.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const keyOf = (index: number) => `${conversationId}:${index}`;

  return {
    target,
    busy: remember.isPending,
    /** Can a message be remembered here: the API only keeps what was said in a saved chat. */
    available: conversationId != null,
    noteFor: (index: number): string | null => notes[keyOf(index)] ?? null,
    ask: (index: number, text: string) => setTarget({ index, text }),
    cancel: () => setTarget(null),
    confirm: () => {
      if (!target || !conversationId) return;
      const key = keyOf(target.index);
      remember.mutate(
        { conversationId, text: target.text },
        {
          onSuccess: () => setNotes((n) => ({ ...n, [key]: REMEMBERED })),
          onError: (error) =>
            setNotes((n) => ({ ...n, [key]: rememberErrorText(toApiError(error)) })),
          onSettled: () => setTarget(null),
        },
      );
    },
  };
}
