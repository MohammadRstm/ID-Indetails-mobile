import type { Schemas } from "@/api/types";
import type { ProtonPendingAction, ProtonSavedChat } from "./api";
import { chatOf } from "./savedChat";

type Stored = ProtonSavedChat["messages"][number];

const cardOf = (id: string): ProtonPendingAction => ({
  id,
  tool: "hold_project",
  risk: "medium",
  expiresAt: "2099-01-01T00:00:00Z",
  target: { type: "project", id: 7, name: "Villa Haddad", domain: "design" },
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

const message = (change: Partial<Stored>): Stored => ({
  seq: 1,
  role: "proton",
  text: "Here.",
  origin: null,
  createdAt: "2026-10-13T08:00:00Z",
  refs: [],
  sources: [],
  cards: [],
  blocks: [],
  ...change,
});

const chat = (change: Partial<ProtonSavedChat> = {}): ProtonSavedChat => ({
  id: "11111111-1111-1111-1111-111111111111",
  title: "Villa Haddad hours",
  createdAt: "2026-10-13T08:00:00Z",
  updatedAt: "2026-10-13T08:05:00Z",
  canContinue: true,
  hidden: null,
  messages: [],
  ...change,
});

const stored = (id: string, status: Schemas["ProtonActionStatus"], text: string | null = null) => ({
  card: cardOf(id),
  status,
  message: text,
});

const validBlock = {
  id: "b1",
  type: "kpis",
  title: "Month",
  period: null,
  chart: null,
  table: null,
  kpis: {
    items: [{ key: "h", label: "Hours", unit: "hours", value: 3, previous: null, change: null }],
  },
  notes: [],
  source: { tool: "t", dataset: "d1", asOf: "2026-10-13T08:00:00Z" },
};

describe("chatOf", () => {
  it("turns the saved messages into the person's and Proton's turns", () => {
    const opened = chatOf(
      chat({
        messages: [
          message({ seq: 1, role: "user", text: "How many hours?" }),
          message({
            seq: 2,
            text: "Three.",
            refs: [{ type: "project", id: 7, name: "Villa Haddad", domain: "design" }],
          }),
        ],
      }),
    );
    expect(opened.conversationId).toBe("11111111-1111-1111-1111-111111111111");
    expect(opened.locked).toBeNull();
    expect(opened.turns[0]).toEqual({ from: "you", text: "How many hours?" });
    expect(opened.turns[1]).toMatchObject({
      from: "proton",
      text: "Three.",
      refs: [{ type: "project", id: 7, name: "Villa Haddad", domain: "design" }],
      choices: [],
      quickReplies: [],
      suggestions: [],
      did: null,
      blocks: [],
    });
  });

  it("keeps each card with the status the API stored", () => {
    const opened = chatOf(
      chat({
        messages: [
          message({
            cards: [
              stored("a-pending", "pending"),
              stored("a-done", "succeeded", "Project put on hold."),
              stored("a-plain", "succeeded"),
              stored("a-failed", "failed", "Not allowed."),
              stored("a-failed-plain", "failed"),
              stored("a-cancelled", "cancelled"),
              stored("a-superseded", "superseded"),
              stored("a-expired", "expired"),
              stored("a-running", "executing"),
            ],
          }),
        ],
      }),
    );
    expect(opened.actions).toEqual({
      "a-pending": { kind: "open" },
      "a-done": { kind: "done", message: "Project put on hold." },
      "a-plain": { kind: "done", message: "Done." },
      "a-failed": { kind: "failed", message: "Not allowed." },
      "a-failed-plain": { kind: "failed", message: "It couldn't be done." },
      "a-cancelled": { kind: "cancelled" },
      "a-superseded": { kind: "replaced" },
      "a-expired": { kind: "expired" },
      "a-running": { kind: "closed" },
    });
    expect(opened.turns[0]).toMatchObject({ cards: expect.arrayContaining([cardOf("a-done")]) });
  });

  it("closes a card that was still waiting when the chat can't be carried on", () => {
    const opened = chatOf(
      chat({
        canContinue: false,
        messages: [message({ cards: [stored("a-pending", "pending")] })],
      }),
    );
    expect(opened.actions["a-pending"]).toEqual({ kind: "closed" });
  });

  it("says why a chat whose access changed can only be read", () => {
    const opened = chatOf(chat({ canContinue: false }));
    expect(opened.locked).toMatch(/access changed/);
  });

  it("gives the API's reason for a chat it hides, and shows no messages", () => {
    const opened = chatOf(
      chat({
        canContinue: false,
        hidden: "You can no longer see what this chat was about.",
        messages: [],
      }),
    );
    expect(opened.locked).toBe("You can no longer see what this chat was about.");
    expect(opened.turns).toEqual([]);
  });

  it("brings back the charts and tables a reply had, and leaves out one that doesn't fit", () => {
    const opened = chatOf(
      chat({
        messages: [
          message({
            blocks: [
              validBlock,
              { ...validBlock, id: "b2", kpis: null },
            ] as unknown as Stored["blocks"],
          }),
        ],
      }),
    );
    const turn = opened.turns[0];
    expect(turn.from === "proton" && turn.blocks.map((b) => b.id)).toEqual(["b1"]);
  });
});
