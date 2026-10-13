import type { ProtonReply } from "@/api/types";
import type { ProtonActionSummary, ProtonPendingAction, ProtonPreview } from "./api";
import type { ActionState, ProtonTurn } from "./chat";

/** A two-step card's Confirm waits this long after Review, so a double tap can't pass both steps. */
export const ARM_MS = 600;

const AREAS: Record<string, string> = {
  design: "Design",
  execution: "Execution",
  company: "Company",
};

/** The cards of a reply: all it proposed, or just the last one from an API that sends only that. */
export function cardsOf(reply: Pick<ProtonReply, "pendingActions" | "pendingAction">) {
  if (reply.pendingActions.length > 0) return reply.pendingActions;
  return reply.pendingAction ? [reply.pendingAction] : [];
}

/** Cards for the same change (the same kind, on the same record): the API keeps only the newest of them. */
const sameChange = (card: ProtonPendingAction) =>
  `${card.tool}:${card.target?.type ?? ""}:${card.target?.id ?? ""}`;

/** For each change, the id of its newest card. Any other card for that change was replaced; the rest stay open. */
export function newestCards(turns: ProtonTurn[]): Map<string, string> {
  const newest = new Map<string, string>();
  for (const turn of turns) {
    if (turn.from !== "proton") continue;
    for (const card of turn.cards) newest.set(sameChange(card), card.id);
  }
  return newest;
}

export const isReplaced = (card: ProtonPendingAction, newest: Map<string, string>) =>
  newest.get(sameChange(card)) !== card.id;

/** A card that asks for more than one tap. */
export const isStrong = (preview: ProtonPreview) => preview.confirm !== "standard";

/** The area the change is in, as a word, when the API names one. */
export function areaLabel(area: string | null): string | null {
  return area != null && Object.hasOwn(AREAS, area) ? AREAS[area] : null;
}

export type CardPill = { label: string; tone: "now" | "ok" | "warn" };

export function pillOf(card: ProtonPendingAction): CardPill {
  if (isStrong(card.preview)) return { label: "Check carefully", tone: "now" };
  return card.risk === "low"
    ? { label: "Low risk", tone: "ok" }
    : { label: "Medium risk", tone: "warn" };
}

/** The typed phrase matches when it is the same words, ignoring case and spaces around it (as the API does). */
export function phraseMatches(preview: ProtonPreview, typed: string): boolean {
  return (
    preview.phrase != null && typed.trim().toLowerCase() === preview.phrase.trim().toLowerCase()
  );
}

type ConfirmInput = {
  preview: ProtonPreview;
  /** Confirm or cancel is on its way. */
  busy: boolean;
  /** A two-step card: Review was pressed and ARM_MS has passed. */
  armed: boolean;
  typed: string;
};

/** Whether Confirm can be pressed now. A typed card with no phrase can't be confirmed at all. */
export function canConfirm({ preview, busy, armed, typed }: ConfirmInput): boolean {
  if (busy) return false;
  switch (preview.confirm) {
    case "typed":
      return phraseMatches(preview, typed);
    case "two_step":
      return armed;
    case "standard":
      return true;
  }
}

/** The phrase goes to the API only with a typed card's Confirm. */
export const typedFor = (preview: ProtonPreview, typed: string) =>
  preview.confirm === "typed" ? typed : undefined;

/** What the API says became of a card, as the chat shows it. */
export function stateOfSummary(summary: ProtonActionSummary): ActionState {
  switch (summary.status) {
    case "pending":
      return { kind: "open" };
    case "succeeded":
      return { kind: "done", message: "Done." };
    case "failed":
      return { kind: "failed", message: summary.errorMessage ?? "It couldn't be done." };
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

export type CardOutcome = { text: string; failed: boolean };

/** The line that replaces the buttons once a card can't be confirmed, or null while it can. */
export function outcomeOf(
  state: ActionState,
  replaced: boolean,
  expired: boolean,
): CardOutcome | null {
  if (state.kind === "open" && !replaced && !expired) return null;
  switch (state.kind) {
    case "done":
      return { text: state.message, failed: false };
    case "failed":
      return { text: state.message, failed: true };
    case "cancelled":
      return { text: "Cancelled. Nothing was changed.", failed: false };
    case "closed":
      return { text: "This card is closed. Ask me again if you still want it.", failed: false };
    default:
      return replaced || state.kind === "replaced"
        ? { text: "Replaced by a newer proposal.", failed: false }
        : { text: "This proposal expired. Ask me again if you still want it.", failed: false };
  }
}
