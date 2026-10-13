import { isReplaced, newestCards } from "../cards";
import type { ActionState, ProtonTurn } from "../chat";
import { moodOf, WORKING_AFTER_MS, type ProtonMood } from "./protonMood";

/** How long the blob keeps talking after the last of the answer, looks upset after a failure, or is pleased. */
export const TALK_TAIL_MS = 900;
export const ERROR_MS = 4_000;
export const HAPPY_MS = 3_000;

/** What the Proton screen knows, as plain facts. */
export type Scene = {
  /** Proton can answer (the allowance and the month's budget are not used up). */
  available: boolean;
  /** A question is being answered. */
  answering: boolean;
  /** Some of the answer's text has arrived. */
  streaming: boolean;
  /** Replies that failed so far. */
  failures: number;
  /** A proposed change is waiting for Confirm. */
  cardOpen: boolean;
  /** Proposed changes that went through so far. */
  confirmed: number;
};

export const NO_SCENE: Scene = {
  available: true,
  answering: false,
  streaming: false,
  failures: 0,
  cardOpen: false,
  confirmed: 0,
};

export type ScreenState = {
  turns: ProtonTurn[];
  actions: Record<string, ActionState>;
  /** The live answer, or null when none is being written. */
  live: { text: unknown } | null;
  blocked: boolean;
};

/** The facts of the Proton screen's state. A card replaced by a newer one for the same change is not waiting. */
export function sceneOf({ turns, actions, live, blocked }: ScreenState): Scene {
  const newest = newestCards(turns);
  const cardOpen = turns.some(
    (turn) =>
      turn.from === "proton" &&
      turn.cards.some(
        (card) => (actions[card.id]?.kind ?? "open") === "open" && !isReplaced(card, newest),
      ),
  );
  return {
    available: !blocked,
    answering: live != null,
    streaming: live?.text != null,
    failures: turns.filter((turn) => turn.from === "error").length,
    cardOpen,
    confirmed: Object.values(actions).filter((state) => state.kind === "done").length,
  };
}

/** The moments the mood counts from: when the question was asked and until when each lingering mood lasts. */
export type MoodClock = {
  askedAt: number | null;
  talkingUntil: number;
  errorUntil: number;
  happyUntil: number;
};

export const NO_CLOCK: MoodClock = { askedAt: null, talkingUntil: 0, errorUntil: 0, happyUntil: 0 };

/** The clock after the screen changed from `before` to `after` at `now`. */
export function advanceClock(
  before: Scene,
  after: Scene,
  clock: MoodClock,
  now: number,
): MoodClock {
  return {
    askedAt: !after.answering ? null : before.answering ? clock.askedAt : now,
    // while the text arrives it keeps talking; it stops a moment after the last of it
    talkingUntil: after.streaming
      ? Number.MAX_SAFE_INTEGER
      : before.streaming
        ? now + TALK_TAIL_MS
        : clock.talkingUntil,
    errorUntil: after.failures > before.failures ? now + ERROR_MS : clock.errorUntil,
    happyUntil: after.confirmed > before.confirmed ? now + HAPPY_MS : clock.happyUntil,
  };
}

/** The blob's mood for the conversation at `now`. */
export function conversationMood(scene: Scene, clock: MoodClock, now: number): ProtonMood {
  return moodOf({ ...scene, ...clock, composing: false }, now);
}

/** When the mood next changes by itself (a moment lapses, or a long question turns to work), if it will. */
export function nextChangeAt(clock: MoodClock, now: number): number | null {
  const moments = [
    clock.askedAt == null ? 0 : clock.askedAt + WORKING_AFTER_MS,
    clock.talkingUntil === Number.MAX_SAFE_INTEGER ? 0 : clock.talkingUntil,
    clock.errorUntil,
    clock.happyUntil,
  ].filter((at) => at > now);
  return moments.length > 0 ? Math.min(...moments) : null;
}
