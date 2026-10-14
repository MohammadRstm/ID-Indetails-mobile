import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { http, HttpResponse } from "msw";
import type { ProtonUiCommand, Schemas } from "@/api/types";
import { takeLogWorkRequest } from "@/features/work/logWorkRequest";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { takeProtonDraft } from "./drafts";
import { ProtonScreen } from "./screens/ProtonScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ about: "project", id: "7", area: "design" }),
}));

// The live stream: a test says how it answers; the default is that it can't be reached, so the JSON endpoint answers.
const mockStream = jest.fn();
jest.mock("expo/fetch", () => ({ fetch: (...args: unknown[]) => mockStream(...args) }));

// Proton reopens on the chat that was open last: each test starts without one.
beforeEach(async () => {
  await Storage.clear();
  mockStream.mockRejectedValue(new TypeError("Network request failed"));
});
afterEach(() => jest.clearAllMocks());

const usage: Schemas["ProtonUsageResponse"] = {
  available: true,
  companyLimitReached: false,
  month: "2026-10-01",
  questionsAllowed: 100,
  questionsRemaining: 87,
  questionsUsed: 13,
  usedPct: 13,
  voiceAvailable: false,
  voiceMaxMinutes: 10,
};

const CONVERSATION = "11111111-1111-1111-1111-111111111111";
const ACTION = "22222222-2222-2222-2222-222222222222";
const OTHER_ACTION = "33333333-3333-3333-3333-333333333333";
const NEWER_ACTION = "44444444-4444-4444-4444-444444444444";

const command = (change: Partial<ProtonUiCommand>): ProtonUiCommand => ({
  type: "open_project",
  id: 7,
  clientId: null,
  domain: "design",
  label: "Villa Haddad",
  page: null,
  section: null,
  tab: null,
  companyTab: null,
  fill: null,
  settingsSection: null,
  sounds: null,
  surface: null,
  theme: null,
  ...change,
});

function reply(
  change: Partial<Schemas["ProtonReplyResponse"]> = {},
): Schemas["ProtonReplyResponse"] {
  return {
    blocks: [],
    choices: [],
    conversationId: CONVERSATION,
    limited: false,
    pendingAction: null,
    pendingActions: [],
    quickReplies: [],
    refs: [],
    reply: "Villa Haddad is on track.",
    rolledOver: false,
    sources: [],
    suggestions: [],
    uiCommands: [],
    usage,
    ...change,
  };
}

function card(
  id: string,
  change: Partial<Schemas["ProtonPendingAction"]> = {},
  preview: Partial<Schemas["ProtonPreview"]> = {},
): Schemas["ProtonPendingAction"] {
  return {
    id,
    tool: "hold_project",
    risk: "medium",
    expiresAt: "2099-01-01T00:00:00Z",
    target: { type: "project", id: 7, name: "Villa Haddad", domain: "design" },
    preview: {
      title: "Put Villa Haddad on hold",
      note: null,
      opensAfter: "Villa Haddad",
      changes: [{ label: "Status", before: "Active", after: "On hold" }],
      confirm: "standard",
      phrase: null,
      area: null,
      irreversible: false,
      reach: null,
      ...preview,
    },
    ...change,
  };
}

const pending = card(ACTION);

const asked: unknown[] = [];
const decided: { path: string; body: unknown }[] = [];
let briefing: Schemas["ProtonBriefingResponse"] = { items: [], more: 0 };

/** The API answers each question with the next reply (the last one repeats), and every decision with "Done.". */
function serve(
  replies: Schemas["ProtonReplyResponse"] | Schemas["ProtonReplyResponse"][],
  outcomeCommands: ProtonUiCommand[] = [],
) {
  briefing = { items: [], more: 0 };
  const list = Array.isArray(replies) ? replies : [replies];
  asked.length = 0;
  decided.length = 0;
  server.use(
    http.get(api("/proton/usage"), () => HttpResponse.json(usage)),
    http.get(api("/proton/briefing"), () => HttpResponse.json(briefing)),
    http.post(api("/proton/messages"), async ({ request }) => {
      asked.push(await request.json());
      return HttpResponse.json(list[Math.min(asked.length, list.length) - 1]);
    }),
    http.post(api("/proton/actions/:id/:decision"), async ({ request, params }) => {
      decided.push({ path: `${params.id}/${params.decision}`, body: await request.json() });
      return HttpResponse.json({
        actionId: String(params.id),
        message: "Done.",
        refs: [],
        status: "succeeded",
        uiCommands: outcomeCommands,
      });
    }),
  );
}

/** From now on the API refuses every Confirm or Cancel with this error. */
function refuseDecisions(code: string, message: string, status = 422) {
  server.use(
    http.post(api("/proton/actions/:id/:decision"), () =>
      HttpResponse.json({ type: "business_rule", code, message, errors: null }, { status }),
    ),
  );
}

async function ask(text: string) {
  await fireEvent.changeText(screen.getByLabelText("Ask Proton"), text);
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));
}

describe("ProtonScreen", () => {
  it("shows the allowance and sends a question with the page it was opened from", async () => {
    serve(reply());
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("87 of 100 questions left this month")).toBeTruthy();
    await ask("How is this project doing?");
    expect(await screen.findByText("Villa Haddad is on track.")).toBeTruthy();
    expect(asked[0]).toEqual({
      conversationId: null,
      text: "How is this project doing?",
      page: {
        area: "design",
        page: "projects",
        entityType: "project",
        entityId: 7,
        section: null,
        surface: null,
      },
    });
  });

  it("changes nothing until Confirm is pressed, then sends only the proposal's id", async () => {
    serve(reply({ pendingAction: pending }), [command({})]);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Put Villa Haddad on hold");
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    expect(decided).toHaveLength(0);

    await fireEvent.press(confirm);
    expect(await screen.findByText(/Done\. Opened Villa Haddad\./)).toBeTruthy();
    expect(decided).toEqual([
      { path: `${ACTION}/confirm`, body: { conversationId: CONVERSATION } },
    ]);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/projects/[id]", params: { id: "7" } });
  });

  it("cancels a proposal without opening anything", async () => {
    serve(reply({ pendingAction: pending }), [command({})]);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Put Villa Haddad on hold");
    await fireEvent.press(await screen.findByRole("button", { name: "Cancel" }));
    expect(await screen.findByText("Cancelled. Nothing was changed.")).toBeTruthy();
    expect(decided[0].path).toBe(`${ACTION}/cancel`);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("sends a picked choice as the record, not as text", async () => {
    serve(
      reply({
        reply: "Which one?",
        choices: [
          { type: "project", id: 7, label: "Villa Haddad", detail: "Design", domain: "design" },
        ],
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("the villa");
    await fireEvent.press(await screen.findByRole("button", { name: /Villa Haddad · Design/ }));
    await waitFor(() => expect(asked).toHaveLength(2));
    expect(asked[1]).toMatchObject({
      conversationId: CONVERSATION,
      choice: { type: "project", id: 7 },
    });
    expect(asked[1]).not.toHaveProperty("text");
  });

  it("opens what Proton's commands name, for a reply that has no proposal", async () => {
    serve(reply({ uiCommands: [command({})] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Open Villa Haddad");
    expect(await screen.findByText("Opened Villa Haddad.")).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith({ pathname: "/projects/[id]", params: { id: "7" } });
  });

  it("says why it can't be asked when the allowance is used", async () => {
    serve(reply());
    server.use(
      http.get(api("/proton/usage"), () =>
        HttpResponse.json({ ...usage, available: false, companyLimitReached: true }),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Proton has used this month's budget.")).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText("Ask Proton"), "Hello");
    await fireEvent.press(screen.getByRole("button", { name: "Send" }));
    expect(asked).toHaveLength(0);
  });

  it("opens a team named in an answer in that team's chat", async () => {
    serve(reply({ refs: [{ type: "team", id: 5, name: "Site crew", domain: null }] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Who is in the crew?");
    await fireEvent.press(await screen.findByRole("button", { name: "Site crew" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/messages/team/[teamId]",
      params: { teamId: "5" },
    });
  });

  it("says a refused question in Proton's words", async () => {
    serve(reply());
    server.use(
      http.post(api("/proton/messages"), () =>
        HttpResponse.json(
          { type: "business_rule", code: "proton_choice_invalid", message: "Nope.", errors: null },
          { status: 422 },
        ),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("the villa");
    expect(
      await screen.findByText("That option isn't available any more. Could you ask me again?"),
    ).toBeTruthy();
  });
});

describe("Proton's cards", () => {
  it("shows every card of a reply, and confirming one leaves the others waiting", async () => {
    const other = card(OTHER_ACTION, { tool: "hold_client" }, { title: "Put Mounir on hold" });
    serve(reply({ pendingActions: [pending, other], pendingAction: other }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Hold both");
    expect(await screen.findByText("Put Villa Haddad on hold")).toBeTruthy();
    expect(screen.getByText("Put Mounir on hold")).toBeTruthy();

    const confirms = screen.getAllByRole("button", { name: "Confirm" });
    expect(confirms).toHaveLength(2);
    await fireEvent.press(confirms[1]);
    await waitFor(() => expect(decided).toHaveLength(1));
    expect(decided[0].path).toBe(`${OTHER_ACTION}/confirm`);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Confirm" })).toHaveLength(1));
  });

  it("falls back to the last card when the reply lists no others", async () => {
    serve(reply({ pendingActions: [], pendingAction: pending }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Hold it");
    expect(await screen.findByRole("button", { name: "Confirm" })).toBeTruthy();
  });

  it("replaces only the card a newer one is for", async () => {
    const other = card(OTHER_ACTION, { tool: "hold_client" }, { title: "Put Mounir on hold" });
    const newer = card(NEWER_ACTION, {}, { title: "Put Villa Haddad on hold again" });
    serve([
      reply({ reply: "First.", pendingActions: [pending, other] }),
      reply({ reply: "Second.", pendingActions: [newer] }),
    ]);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Hold both");
    expect(await screen.findByText("First.")).toBeTruthy();
    await ask("Hold the villa again");
    expect(await screen.findByText("Second.")).toBeTruthy();

    expect(screen.getAllByText("Replaced by a newer proposal.")).toHaveLength(1);
    // the other change's card and the villa's newer card can still be confirmed
    expect(screen.getAllByRole("button", { name: "Confirm" })).toHaveLength(2);
  });

  it("closes a card whose proposal ran out", async () => {
    serve(reply({ pendingActions: [card(ACTION, { expiresAt: "2020-01-01T00:00:00Z" })] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Hold it");
    expect(
      await screen.findByText("This proposal expired. Ask me again if you still want it."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
  });

  it("marks a strong card and says where it reaches and that it can't be undone", async () => {
    const strong = card(
      ACTION,
      {},
      { confirm: "two_step", area: "execution", reach: "Reaches 12 people.", irreversible: true },
    );
    serve(reply({ pendingActions: [strong] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Do it");
    expect(await screen.findByText("Check carefully")).toBeTruthy();
    expect(screen.getByText(/Change for you to confirm · Execution/)).toBeTruthy();
    expect(screen.getByText("Reaches 12 people.")).toBeTruthy();
    expect(screen.getByText("This can't be undone.")).toBeTruthy();
  });

  it("needs Review, then a moment, before a two-step card can be confirmed", async () => {
    serve(reply({ pendingActions: [card(ACTION, {}, { confirm: "two_step" })] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Do it");
    const review = await screen.findByRole("button", { name: "Review" });
    expect(screen.queryByRole("button", { name: "Confirm" })).toBeNull();
    await fireEvent.press(review);

    const confirm = await screen.findByRole("button", { name: "Confirm" });
    expect(confirm).toBeDisabled();
    await waitFor(() => expect(confirm).toBeEnabled());
    await fireEvent.press(confirm);
    await waitFor(() => expect(decided).toHaveLength(1));
    expect(decided[0]).toEqual({
      path: `${ACTION}/confirm`,
      body: { conversationId: CONVERSATION },
    });
  });

  it("takes a typed card's phrase in a sheet and sends it with the Confirm", async () => {
    const typed = card(ACTION, {}, { confirm: "typed", phrase: "Villa Haddad" });
    serve(reply({ pendingActions: [typed] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Archive the villa");
    await fireEvent.press(await screen.findByRole("button", { name: "Type to confirm" }));

    const input = await screen.findByLabelText("Type the phrase");
    expect(screen.getByText("Villa Haddad")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();

    await fireEvent.changeText(input, "Villa Hadda");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    await fireEvent.changeText(input, "villa haddad");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();

    await fireEvent.press(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(decided).toHaveLength(1));
    expect(decided[0]).toEqual({
      path: `${ACTION}/confirm`,
      body: { conversationId: CONVERSATION, typed: "villa haddad" },
    });
  });

  it("keeps a typed card waiting when the API refuses the phrase", async () => {
    const typed = card(ACTION, {}, { confirm: "typed", phrase: "Villa Haddad" });
    serve(reply({ pendingActions: [typed] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Archive the villa");
    await fireEvent.press(await screen.findByRole("button", { name: "Type to confirm" }));
    await fireEvent.changeText(await screen.findByLabelText("Type the phrase"), "Villa Haddad");
    refuseDecisions("proton_phrase_mismatch", "Type “Villa Haddad” exactly to confirm.");
    await fireEvent.press(screen.getByRole("button", { name: "Confirm" }));

    expect(
      await screen.findByText("That isn't the phrase on the card. Type it exactly as shown."),
    ).toBeTruthy();
    expect(screen.getByLabelText("Type the phrase")).toBeTruthy();
  });

  it("says a refused change in Proton's words", async () => {
    serve(reply({ pendingActions: [pending] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Hold it");
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    refuseDecisions("proton_actions_off", "Switched off.");
    await fireEvent.press(confirm);
    expect(
      await screen.findByText(
        "I can't make this kind of change right now. You can make it in the app.",
      ),
    ).toBeTruthy();
  });

  it("reads what became of a card the API says is no longer waiting", async () => {
    serve(reply({ pendingActions: [pending] }));
    server.use(
      http.get(api("/proton/actions"), () =>
        HttpResponse.json([
          {
            id: ACTION,
            tool: "hold_project",
            title: "Put Villa Haddad on hold",
            status: "cancelled",
            createdAt: "2026-10-13T08:00:00Z",
            decidedAt: "2026-10-13T08:01:00Z",
            errorMessage: null,
            resultId: null,
            resultType: null,
            who: null,
          },
        ]),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Hold it");
    const confirm = await screen.findByRole("button", { name: "Confirm" });
    refuseDecisions("proton_action_not_pending", "This proposal was cancelled.", 409);
    await fireEvent.press(confirm);
    expect(await screen.findByText("Cancelled. Nothing was changed.")).toBeTruthy();
  });
});

const encoder = new TextEncoder();
const event = (name: string, data: unknown) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

/** A live stream that delivers these chunks, one read each. */
function streamOf(...chunks: string[]) {
  let next = 0;
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    body: {
      getReader: () => ({
        read: async () =>
          next < chunks.length
            ? { done: false, value: encoder.encode(chunks[next++]) }
            : { done: true },
        cancel: async () => undefined,
      }),
    },
  };
}

describe("Proton's live answers", () => {
  it("shows the answer from the stream and does not ask the JSON endpoint", async () => {
    serve(reply());
    mockStream.mockResolvedValue(
      streamOf(
        event("status", { text: "Reading the project" }),
        event("delta", { trip: 1, text: "Villa Haddad is on track." }),
        event("done", reply()),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("How is this project doing?");
    expect(await screen.findByText("Villa Haddad is on track.")).toBeTruthy();
    expect(asked).toHaveLength(0);
    expect(mockStream).toHaveBeenCalledTimes(1);
    const init = mockStream.mock.calls[0][1] as { body: string };
    expect(JSON.parse(init.body)).toMatchObject({
      conversationId: null,
      text: "How is this project doing?",
      page: { area: "design", entityType: "project", entityId: 7 },
    });
  });

  it("asks the JSON endpoint instead when the stream can't be reached", async () => {
    serve(reply());
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("How is this project doing?");
    expect(await screen.findByText("Villa Haddad is on track.")).toBeTruthy();
    expect(asked).toHaveLength(1);
  });

  it("says an error that arrives as an event, in Proton's words", async () => {
    serve(reply());
    mockStream.mockResolvedValue(
      streamOf(
        event("status", { text: "Reading the project" }),
        event("error", {
          type: "business_rule",
          code: "proton_choice_invalid",
          message: "Nope.",
          errors: null,
        }),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("the villa");
    expect(
      await screen.findByText("That option isn't available any more. Could you ask me again?"),
    ).toBeTruthy();
  });

  it("stops an answer on its way and keeps nothing of it", async () => {
    serve(reply());
    mockStream.mockImplementation(async (_url: string, init: { signal: AbortSignal }) => {
      let release = () => {};
      const blocked = new Promise<void>((resolve) => {
        release = resolve;
      });
      init.signal.addEventListener("abort", release);
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        body: {
          getReader: () => ({
            read: async () => {
              await blocked;
              return { done: true };
            },
            cancel: async () => release(),
          }),
        },
      };
    });
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("How is this project doing?");
    await fireEvent.press(await screen.findByRole("button", { name: "Stop" }));
    expect(await screen.findByText("Stopped. Nothing from that answer was kept.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
    expect(screen.queryByText("Villa Haddad is on track.")).toBeNull();
    expect(asked).toHaveLength(0);
  });
});

describe("Proton's welcome and reply buttons", () => {
  it("greets, lists what needs a look and asks a starter as an ordinary question", async () => {
    serve(reply());
    briefing = {
      more: 1,
      items: [
        {
          project: { type: "project", id: 7, name: "Villa Haddad", domain: "design" },
          domain: "design",
          facts: ["3 requirements are overdue"],
        },
      ],
    };
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText(/Good (morning|afternoon|evening), Nadia\./)).toBeTruthy();
    expect(await screen.findByText("3 requirements are overdue")).toBeTruthy();
    expect(screen.getByText("There is 1 more. Ask me what needs your attention.")).toBeTruthy();

    await fireEvent.press(screen.getByText("Villa Haddad"));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/projects/[id]", params: { id: "7" } });

    await fireEvent.press(screen.getByRole("button", { name: "How is this project doing?" }));
    await waitFor(() => expect(asked).toHaveLength(1));
    expect(asked[0]).toMatchObject({ text: "How is this project doing?" });
  });

  it("sends a quick reply and a suggestion as what they are, never as text", async () => {
    serve([
      reply({
        reply: "Which period?",
        quickReplies: [{ reply: "last_month", label: "Last month" }],
      }),
      reply({ reply: "Here it is.", suggestions: ["Show overdue projects"] }),
      reply({ reply: "These are overdue." }),
    ]);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("How much did we bill?");
    await fireEvent.press(await screen.findByRole("button", { name: "Last month" }));
    await waitFor(() => expect(asked).toHaveLength(2));
    expect(asked[1]).toMatchObject({ conversationId: CONVERSATION, reply: "last_month" });
    expect(asked[1]).not.toHaveProperty("text");

    await fireEvent.press(await screen.findByRole("button", { name: "Show overdue projects" }));
    await waitFor(() => expect(asked).toHaveLength(3));
    expect(asked[2]).toMatchObject({ conversationId: CONVERSATION, suggestion: 0 });
    expect(asked[2]).not.toHaveProperty("text");
    // the buttons belonged to the reply before: the newest has none
    expect(await screen.findByText("These are overdue.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show overdue projects" })).toBeNull();
  });

  it("says when the chat was summed up to carry on", async () => {
    serve(reply({ rolledOver: true }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Carry on");
    expect(
      await screen.findByText(
        "Our chat was getting long, so I kept a short summary of it and carried on.",
      ),
    ).toBeTruthy();
  });

  it("asks a typed question again in a new chat when the old one has ended", async () => {
    serve(reply());
    const bodies: unknown[] = [];
    server.use(
      http.post(api("/proton/messages"), async ({ request }) => {
        bodies.push(await request.json());
        if (bodies.length === 2) {
          return HttpResponse.json(
            {
              type: "not_found",
              code: "proton_conversation_ended",
              message: "That chat has ended.",
              errors: null,
            },
            { status: 404 },
          );
        }
        return HttpResponse.json(reply({ reply: bodies.length === 1 ? "First." : "Second." }));
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("one");
    expect(await screen.findByText("First.")).toBeTruthy();
    await ask("two");
    expect(await screen.findByText("Second.")).toBeTruthy();
    expect(bodies[1]).toMatchObject({ conversationId: CONVERSATION, text: "two" });
    expect(bodies[2]).toMatchObject({ conversationId: null, text: "two" });
    expect(screen.getByText("That chat has ended.")).toBeTruthy();
  });
});

describe("Proton's commands on the phone", () => {
  const fillForm = (change: Partial<Schemas["ProtonFormFill"]>): Schemas["ProtonFormFill"] => ({
    form: "log_work",
    id: null,
    client: null,
    editProject: null,
    invite: null,
    logWork: null,
    meeting: null,
    message: null,
    newProject: null,
    reportBug: null,
    ...change,
  });

  it("opens log work with what Proton filled in, and saves nothing", async () => {
    serve(
      reply({
        uiCommands: [
          command({ type: "open_surface", surface: "log_work", id: null, label: "Log work" }),
          command({
            type: "fill_form",
            id: null,
            label: "Log work",
            fill: fillForm({
              logWork: {
                projectId: 7,
                day: null,
                startMinute: 540,
                endMinute: 600,
                description: null,
              },
            }),
          }),
        ],
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designEmployee" });
    await ask("Log an hour on the villa from 9");
    expect(
      await screen.findByText("Opened Log work. Filled project, start, end: check it and save."),
    ).toBeTruthy();
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/log-work");
    expect(takeLogWorkRequest()).toEqual({
      projectId: 7,
      startMin: 540,
      endMin: 600,
      filledByProton: ["project", "start", "end"],
    });
  });

  it("opens a chat with the message waiting in it, and sends nothing", async () => {
    serve(
      reply({
        uiCommands: [
          command({
            type: "fill_form",
            id: null,
            domain: null,
            surface: "message_person",
            label: "your message",
            fill: fillForm({ form: "message", id: 9, message: { body: "Running late." } }),
          }),
        ],
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designEmployee" });
    await ask("Tell Omar I am running late");
    expect(await screen.findByText("Wrote your message: read it, then press Send.")).toBeTruthy();
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/messages/direct/[userId]",
      params: { userId: "9" },
    });
    expect(takeProtonDraft({ kind: "direct", userId: 9 })).toBe("Running late.");
  });

  it("says a form the phone doesn't have couldn't be opened here", async () => {
    serve(
      reply({
        uiCommands: [command({ type: "open_surface", surface: "new_project", id: null })],
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "superAdmin" });
    await ask("Start a new project");
    expect(await screen.findByText("That couldn't be opened here.")).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
  });

  it("switches the theme when asked", async () => {
    serve(reply({ uiCommands: [command({ type: "set_preference", theme: "dark", id: null })] }));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Go dark");
    expect(await screen.findByText("Switched to dark mode.")).toBeTruthy();
  });
});
