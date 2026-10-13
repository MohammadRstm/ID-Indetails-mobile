import type { Schemas } from "@/api/types";
import type { ProtonActionSummary, ProtonPendingAction, ProtonPreview } from "./api";
import {
  areaLabel,
  canConfirm,
  cardsOf,
  isReplaced,
  newestCards,
  outcomeOf,
  phraseMatches,
  pillOf,
  stateOfSummary,
  typedFor,
} from "./cards";
import type { ProtonTurn } from "./chat";

const preview = (change: Partial<ProtonPreview> = {}): ProtonPreview => ({
  title: "Put Villa Haddad on hold",
  note: null,
  opensAfter: null,
  changes: [],
  confirm: "standard",
  phrase: null,
  area: null,
  irreversible: false,
  reach: null,
  ...change,
});

const card = (
  id: string,
  change: Partial<ProtonPendingAction> = {},
  p: Partial<ProtonPreview> = {},
): ProtonPendingAction => ({
  id,
  tool: "hold_project",
  risk: "medium",
  expiresAt: "2099-01-01T00:00:00Z",
  target: { type: "project", id: 7, name: "Villa Haddad", domain: "design" },
  preview: preview(p),
  ...change,
});

const answer = (...cards: ProtonPendingAction[]): ProtonTurn => ({
  from: "proton",
  text: "Here.",
  refs: [],
  sources: [],
  cards,
  choices: [],
  did: null,
});

const summary = (
  status: Schemas["ProtonActionStatus"],
  errorMessage: string | null = null,
): ProtonActionSummary => ({
  id: "a1",
  tool: "hold_project",
  title: "Put Villa Haddad on hold",
  status,
  createdAt: "2026-10-13T08:00:00Z",
  decidedAt: null,
  errorMessage,
  resultId: null,
  resultType: null,
  who: null,
});

describe("cardsOf", () => {
  it("takes every card of a reply", () => {
    const a = card("a");
    const b = card("b");
    expect(cardsOf({ pendingActions: [a, b], pendingAction: b })).toEqual([a, b]);
  });

  it("falls back to the last card when the reply lists no others", () => {
    const a = card("a");
    expect(cardsOf({ pendingActions: [], pendingAction: a })).toEqual([a]);
    expect(cardsOf({ pendingActions: [], pendingAction: null })).toEqual([]);
  });
});

describe("a newer card for the same change", () => {
  it("replaces only the card of the same tool and target", () => {
    const first = card("a1");
    const otherTool = card("b1", { tool: "hold_client" });
    const otherTarget = card("c1", {
      target: { type: "project", id: 8, name: "Villa Mounir", domain: "design" },
    });
    const newer = card("a2");
    const newest = newestCards([answer(first, otherTool, otherTarget), answer(newer)]);

    expect(isReplaced(first, newest)).toBe(true);
    expect(isReplaced(newer, newest)).toBe(false);
    expect(isReplaced(otherTool, newest)).toBe(false);
    expect(isReplaced(otherTarget, newest)).toBe(false);
  });

  it("treats cards without a target as one change per tool", () => {
    const a = card("a1", { target: null });
    const b = card("a2", { target: null });
    const newest = newestCards([answer(a), { from: "you", text: "again" }, answer(b)]);
    expect(isReplaced(a, newest)).toBe(true);
    expect(isReplaced(b, newest)).toBe(false);
  });
});

describe("the card's wording", () => {
  it("calls a strong card 'Check carefully' and a standard one by its risk", () => {
    expect(pillOf(card("a", {}, { confirm: "two_step" }))).toEqual({
      label: "Check carefully",
      tone: "now",
    });
    expect(pillOf(card("a", {}, { confirm: "typed", phrase: "x" })).label).toBe("Check carefully");
    expect(pillOf(card("a", { risk: "low" }))).toEqual({ label: "Low risk", tone: "ok" });
    expect(pillOf(card("a", { risk: "medium" }))).toEqual({ label: "Medium risk", tone: "warn" });
  });

  it("names the areas it knows and ignores the rest", () => {
    expect(areaLabel("design")).toBe("Design");
    expect(areaLabel("execution")).toBe("Execution");
    expect(areaLabel("company")).toBe("Company");
    expect(areaLabel("toString")).toBeNull();
    expect(areaLabel(null)).toBeNull();
  });
});

describe("when Confirm can be pressed", () => {
  const idle = { busy: false, armed: false, typed: "" };

  it("is always for a standard card, except while a decision is on its way", () => {
    expect(canConfirm({ ...idle, preview: preview() })).toBe(true);
    expect(canConfirm({ ...idle, busy: true, preview: preview() })).toBe(false);
  });

  it("waits for Review and the pause on a two-step card", () => {
    const p = preview({ confirm: "two_step" });
    expect(canConfirm({ ...idle, preview: p })).toBe(false);
    expect(canConfirm({ ...idle, armed: true, preview: p })).toBe(true);
    expect(canConfirm({ ...idle, armed: true, busy: true, preview: p })).toBe(false);
  });

  it("waits for the phrase on a typed card", () => {
    const p = preview({ confirm: "typed", phrase: "Villa Haddad" });
    expect(canConfirm({ ...idle, preview: p })).toBe(false);
    expect(canConfirm({ ...idle, typed: "Villa Hadda", preview: p })).toBe(false);
    expect(canConfirm({ ...idle, typed: "Villa Haddad", preview: p })).toBe(true);
    // being armed doesn't matter to a typed card
    expect(canConfirm({ ...idle, armed: true, preview: p })).toBe(false);
  });

  it("never confirms a typed card that came without its phrase", () => {
    const p = preview({ confirm: "typed", phrase: null });
    expect(canConfirm({ ...idle, typed: "", armed: true, preview: p })).toBe(false);
  });
});

describe("the typed phrase", () => {
  const p = preview({ confirm: "typed", phrase: "Villa Haddad" });

  it("matches ignoring case and spaces around it, as the API does", () => {
    expect(phraseMatches(p, "Villa Haddad")).toBe(true);
    expect(phraseMatches(p, "  villa haddad ")).toBe(true);
    expect(phraseMatches(p, "Villa  Haddad")).toBe(false);
    expect(phraseMatches(p, "")).toBe(false);
  });

  it("goes to the API only with a typed card", () => {
    expect(typedFor(p, "villa haddad")).toBe("villa haddad");
    expect(typedFor(preview({ confirm: "two_step" }), "villa haddad")).toBeUndefined();
    expect(typedFor(preview(), "villa haddad")).toBeUndefined();
  });
});

describe("a card brought back from the API", () => {
  it("reads every status", () => {
    expect(stateOfSummary(summary("pending"))).toEqual({ kind: "open" });
    expect(stateOfSummary(summary("succeeded"))).toEqual({ kind: "done", message: "Done." });
    expect(stateOfSummary(summary("failed", "Not allowed."))).toEqual({
      kind: "failed",
      message: "Not allowed.",
    });
    expect(stateOfSummary(summary("failed"))).toEqual({
      kind: "failed",
      message: "It couldn't be done.",
    });
    expect(stateOfSummary(summary("cancelled"))).toEqual({ kind: "cancelled" });
    expect(stateOfSummary(summary("superseded"))).toEqual({ kind: "replaced" });
    expect(stateOfSummary(summary("expired"))).toEqual({ kind: "expired" });
    expect(stateOfSummary(summary("executing"))).toEqual({ kind: "closed" });
  });
});

describe("what a card says once it is closed", () => {
  it("says nothing while it can be confirmed", () => {
    expect(outcomeOf({ kind: "open" }, false, false)).toBeNull();
  });

  it("says what became of it", () => {
    expect(outcomeOf({ kind: "done", message: "Done." }, false, false)).toEqual({
      text: "Done.",
      failed: false,
    });
    expect(outcomeOf({ kind: "failed", message: "No." }, false, false)).toEqual({
      text: "No.",
      failed: true,
    });
    expect(outcomeOf({ kind: "cancelled" }, false, false)?.text).toBe(
      "Cancelled. Nothing was changed.",
    );
    expect(outcomeOf({ kind: "closed" }, false, false)?.text).toMatch(/closed/);
  });

  it("says a newer proposal replaced it, or that it ran out", () => {
    expect(outcomeOf({ kind: "open" }, true, false)?.text).toBe("Replaced by a newer proposal.");
    expect(outcomeOf({ kind: "replaced" }, false, false)?.text).toBe(
      "Replaced by a newer proposal.",
    );
    expect(outcomeOf({ kind: "open" }, false, true)?.text).toBe(
      "This proposal expired. Ask me again if you still want it.",
    );
    expect(outcomeOf({ kind: "expired" }, false, false)?.text).toMatch(/expired/);
  });
});
