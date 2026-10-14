import type { ProtonPendingAction } from "../api";
import type { ProtonTurn } from "../chat";
import {
  advanceClock,
  conversationMood,
  ERROR_MS,
  HAPPY_MS,
  nextChangeAt,
  NO_CLOCK,
  NO_SCENE,
  sceneOf,
  TALK_TAIL_MS,
} from "./conversationMood";
import { WORKING_AFTER_MS } from "./protonMood";

const card = (id: string, target = 7): ProtonPendingAction => ({
  id,
  tool: "hold_project",
  risk: "medium",
  expiresAt: "2099-01-01T00:00:00Z",
  target: { type: "project", id: target, name: "Villa Haddad", domain: "design" },
  preview: {
    title: "Put Villa Haddad on hold",
    note: null,
    opensAfter: null,
    changes: [],
    confirm: "standard",
    phrase: null,
    area: null,
    irreversible: false,
    reach: null,
  },
});

const reply = (...cards: ProtonPendingAction[]): ProtonTurn => ({
  from: "proton",
  text: "Here.",
  refs: [],
  sources: [],
  cards,
  choices: [],
  quickReplies: [],
  suggestions: [],
  did: null,
  blocks: [],
});

const idle = { turns: [], actions: {}, live: null, blocked: false };

describe("the scene of the Proton screen", () => {
  it("is calm at the start", () => {
    expect(sceneOf(idle)).toEqual(NO_SCENE);
  });

  it("is answering while a reply is written, and streaming once text arrives", () => {
    expect(sceneOf({ ...idle, live: { text: null } })).toMatchObject({
      answering: true,
      streaming: false,
    });
    expect(sceneOf({ ...idle, live: { text: { text: "Hi" } } })).toMatchObject({
      answering: true,
      streaming: true,
    });
  });

  it("is unavailable when the allowance is used up", () => {
    expect(sceneOf({ ...idle, blocked: true }).available).toBe(false);
  });

  it("counts failed replies", () => {
    const turns: ProtonTurn[] = [
      { from: "you", text: "Hi" },
      { from: "error", text: "No." },
    ];
    expect(sceneOf({ ...idle, turns }).failures).toBe(1);
  });

  it("has a card open until it is decided, replaced or closed", () => {
    const turns = [reply(card("a"))];
    expect(sceneOf({ ...idle, turns }).cardOpen).toBe(true);
    expect(sceneOf({ ...idle, turns, actions: { a: { kind: "open" } } }).cardOpen).toBe(true);
    for (const kind of ["cancelled", "expired", "closed", "replaced"] as const) {
      expect(sceneOf({ ...idle, turns, actions: { a: { kind } } }).cardOpen).toBe(false);
    }
    const done = sceneOf({ ...idle, turns, actions: { a: { kind: "done", message: "Done." } } });
    expect(done).toMatchObject({ cardOpen: false, confirmed: 1 });
  });

  it("does not wait on a card that a newer one for the same change replaced", () => {
    const turns = [reply(card("old")), reply(card("new"))];
    const actions = { new: { kind: "done", message: "Done." } } as const;
    expect(sceneOf({ ...idle, turns, actions }).cardOpen).toBe(false);
  });
});

describe("the mood over a conversation", () => {
  const T0 = 1_000_000;

  it("goes from thinking to working after three seconds, then talks as the text arrives", () => {
    const asking = { ...NO_SCENE, answering: true };
    let clock = advanceClock(NO_SCENE, asking, NO_CLOCK, T0);
    expect(conversationMood(asking, clock, T0)).toBe("thinking");
    expect(nextChangeAt(clock, T0)).toBe(T0 + WORKING_AFTER_MS);
    expect(conversationMood(asking, clock, T0 + WORKING_AFTER_MS)).toBe("working");

    const streaming = { ...asking, streaming: true };
    clock = advanceClock(asking, streaming, clock, T0 + 4_000);
    expect(conversationMood(streaming, clock, T0 + 5_000)).toBe("talking");
    // while text keeps arriving there is no deadline to wake for
    expect(nextChangeAt(clock, T0 + 5_000)).toBeNull();
  });

  it("keeps talking a moment after the answer ends, then rests", () => {
    const streaming = { ...NO_SCENE, answering: true, streaming: true };
    let clock = advanceClock(NO_SCENE, streaming, NO_CLOCK, T0);
    clock = advanceClock(streaming, NO_SCENE, clock, T0 + 2_000);
    expect(clock.askedAt).toBeNull();
    expect(conversationMood(NO_SCENE, clock, T0 + 2_000 + TALK_TAIL_MS - 1)).toBe("talking");
    expect(conversationMood(NO_SCENE, clock, T0 + 2_000 + TALK_TAIL_MS)).toBe("idle");
  });

  it("looks upset for a while after a failure", () => {
    const failed = { ...NO_SCENE, failures: 1 };
    const clock = advanceClock(NO_SCENE, failed, NO_CLOCK, T0);
    expect(conversationMood(failed, clock, T0 + ERROR_MS - 1)).toBe("error");
    expect(conversationMood(failed, clock, T0 + ERROR_MS)).toBe("idle");
  });

  it("is pleased for a while after a confirmed change, and waits on an open card otherwise", () => {
    const waiting = { ...NO_SCENE, cardOpen: true };
    expect(conversationMood(waiting, NO_CLOCK, T0)).toBe("proposing");
    const done = { ...NO_SCENE, confirmed: 1 };
    const clock = advanceClock(waiting, done, NO_CLOCK, T0);
    expect(conversationMood(done, clock, T0 + HAPPY_MS - 1)).toBe("happy");
    expect(conversationMood(done, clock, T0 + HAPPY_MS)).toBe("idle");
  });

  it("is asleep when Proton can't answer, whatever else happens", () => {
    const blocked = { ...NO_SCENE, available: false, failures: 1 };
    const clock = advanceClock(NO_SCENE, blocked, NO_CLOCK, T0);
    expect(conversationMood(blocked, clock, T0)).toBe("asleep");
  });

  it("changes nothing when nothing changed", () => {
    expect(advanceClock(NO_SCENE, NO_SCENE, NO_CLOCK, T0)).toEqual(NO_CLOCK);
  });
});
