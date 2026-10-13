import { useEffect, useState } from "react";
import { toApiError } from "@/api/errors";
import { useDecideAction, useMyProtonActions, type ProtonPendingAction } from "../api";
import { ARM_MS, canConfirm, outcomeOf, stateOfSummary, typedFor } from "../cards";
import type { ActionState } from "../chat";
import { ActionCard } from "../components/ActionCard";
import { PhraseSheet } from "../components/PhraseSheet";
import { protonErrorText } from "../errorWords";
import { useCarryOut } from "../useCarryOut";

type ProtonActionCardProps = {
  action: ProtonPendingAction;
  conversationId: string;
  state: ActionState;
  /** A newer proposal for the same change replaced this one: the API would refuse it, so the card says so. */
  replaced: boolean;
  onDecided: (state: ActionState) => void;
};

/**
 * One proposed change in the chat. The Confirm sends only the proposal's id and conversation (and, for a typed
 * card, the phrase the person typed); the API checks and runs the stored change itself. A two-step card needs
 * Review first, and its Confirm waits a moment after.
 */
export function ProtonActionCard({
  action,
  conversationId,
  state,
  replaced,
  onDecided,
}: ProtonActionCardProps) {
  const decide = useDecideAction();
  const carryOut = useCarryOut();
  const { preview } = action;

  // A card that lost track of its status asks the API what became of it.
  const restored = useMyProtonActions(state.kind === "closed");
  const known =
    state.kind === "closed" ? restored.data?.find((a) => a.id === action.id) : undefined;
  const current = known ? stateOfSummary(known) : state;

  const [expired, setExpired] = useState(() => new Date(action.expiresAt).getTime() <= Date.now());
  // The card closes by itself when the proposal runs out, as the API would refuse it from then on.
  useEffect(() => {
    if (expired) return;
    const wait = new Date(action.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => setExpired(true), Math.min(wait, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [action.expiresAt, expired]);

  const [reviewing, setReviewing] = useState(false);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!reviewing) return;
    const timer = setTimeout(() => setArmed(true), ARM_MS);
    return () => clearTimeout(timer);
  }, [reviewing]);

  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [phraseError, setPhraseError] = useState<string | undefined>();

  const busy = decide.isPending;
  const outcome = outcomeOf(current, replaced, expired);
  const confirmable = canConfirm({ preview, busy, armed, typed });

  function send(decision: "confirm" | "cancel") {
    setPhraseError(undefined);
    decide.mutate(
      {
        action,
        conversationId,
        decision,
        typed: decision === "confirm" ? typedFor(preview, typed) : undefined,
      },
      {
        onSuccess: (result) => {
          setTyping(false);
          if (decision === "cancel") return onDecided({ kind: "cancelled" });
          // The API sends where to go only after a change that succeeded and whose card said so.
          const did = carryOut(result.uiCommands);
          onDecided({ kind: "done", message: did ? `${result.message} ${did}` : result.message });
        },
        onError: (error) => {
          const failure = toApiError(error);
          // A wrong phrase leaves the proposal waiting: say so where it is typed.
          if (failure.code === "proton_phrase_mismatch") {
            return setPhraseError(protonErrorText(failure));
          }
          setTyping(false);
          // Decided already, elsewhere or by a second tap: the card reads its real status from the API.
          if (failure.code === "proton_action_not_pending") return onDecided({ kind: "closed" });
          onDecided({ kind: "failed", message: protonErrorText(failure) });
        },
      },
    );
  }

  return (
    <>
      <ActionCard
        action={action}
        outcome={outcome}
        reviewing={reviewing}
        canConfirm={confirmable}
        busy={busy}
        onReview={() => setReviewing(true)}
        onConfirm={() => send("confirm")}
        onOpenPhrase={() => setTyping(true)}
        onCancel={() => send("cancel")}
      />
      {preview.confirm === "typed" && preview.phrase ? (
        <PhraseSheet
          visible={typing && outcome == null}
          title={preview.title}
          phrase={preview.phrase}
          value={typed}
          onChangeText={(text) => {
            setTyped(text);
            setPhraseError(undefined);
          }}
          error={phraseError}
          canConfirm={confirmable}
          busy={busy}
          onConfirm={() => send("confirm")}
          onClose={() => setTyping(false)}
        />
      ) : null}
    </>
  );
}
