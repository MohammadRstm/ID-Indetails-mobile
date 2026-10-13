import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { http, HttpResponse } from "msw";
import type { Schemas } from "@/api/types";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { ProtonScreen } from "./screens/ProtonScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));

// The live stream can't be reached here, so the JSON endpoint answers.
jest.mock("expo/fetch", () => ({
  fetch: () => Promise.reject(new TypeError("Network request failed")),
}));

const CHAT = "11111111-1111-1111-1111-111111111111";
const OTHER_CHAT = "22222222-2222-2222-2222-222222222222";
// designAdmin's id: the phone keeps the open chat under it
const OPEN_CHAT_KEY = "idi.proton.chat.2";

beforeEach(async () => {
  await Storage.clear();
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
};

const source = { tool: "get_time_summary", dataset: "d1", asOf: "2026-10-13T09:30:00Z" };

type SavedChat = Schemas["ProtonConversationResponse"];
type Stored = SavedChat["messages"][number];

const message = (change: Partial<Stored>): Stored => ({
  seq: 2,
  role: "proton",
  text: "Three hours.",
  origin: null,
  createdAt: "2026-10-13T08:00:05Z",
  refs: [],
  sources: [],
  cards: [],
  blocks: [],
  ...change,
});

const chat = (change: Partial<SavedChat> = {}): SavedChat => ({
  id: CHAT,
  title: "Villa hours",
  createdAt: "2026-10-13T08:00:00Z",
  updatedAt: "2026-10-13T08:05:00Z",
  canContinue: true,
  hidden: null,
  messages: [
    message({ seq: 1, role: "user", text: "How many hours on the villa?", origin: "typed" }),
    message({}),
  ],
  ...change,
});

const summary = (id: string, title: string) => ({
  id,
  title,
  createdAt: "2026-10-13T08:00:00Z",
  updatedAt: "2026-10-13T08:05:00Z",
  messageCount: 2,
});

const asked: unknown[] = [];

/** The API answers the usual Proton calls; a test adds what it is about with `server.use`. */
function serve(reply?: Partial<Schemas["ProtonReplyResponse"]>) {
  asked.length = 0;
  server.use(
    http.get(api("/proton/usage"), () => HttpResponse.json(usage)),
    http.get(api("/proton/briefing"), () => HttpResponse.json({ items: [], more: 0 })),
    http.post(api("/proton/messages"), async ({ request }) => {
      asked.push(await request.json());
      return HttpResponse.json({
        blocks: [],
        choices: [],
        conversationId: CHAT,
        limited: false,
        pendingAction: null,
        pendingActions: [],
        quickReplies: [],
        refs: [],
        reply: "Three hours.",
        rolledOver: false,
        sources: [],
        suggestions: [],
        uiCommands: [],
        usage,
        ...reply,
      });
    }),
  );
}

async function ask(text: string) {
  await fireEvent.changeText(screen.getByLabelText("Ask Proton"), text);
  await fireEvent.press(screen.getByRole("button", { name: "Send" }));
}

describe("a new conversation", () => {
  it("leaves the chat without deleting it", async () => {
    serve();
    const deleted: string[] = [];
    server.use(
      http.delete(api("/proton/conversations/:id"), ({ params }) => {
        deleted.push(String(params.id));
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("How many hours on the villa?");
    expect(await screen.findByText("Three hours.")).toBeTruthy();
    expect(Storage.getItemSync(OPEN_CHAT_KEY)).toBe(CHAT);

    await fireEvent.press(screen.getByRole("button", { name: "New conversation" }));
    expect(await screen.findByText(/Good (morning|afternoon|evening), Nadia\./)).toBeTruthy();
    expect(screen.queryByText("Three hours.")).toBeNull();
    expect(Storage.getItemSync(OPEN_CHAT_KEY)).toBeNull();
    expect(deleted).toEqual([]);
  });
});

describe("reopening Proton", () => {
  it("shows the chat that was open last, with what became of its answers", async () => {
    serve();
    Storage.setItemSync(OPEN_CHAT_KEY, CHAT);
    server.use(http.get(api(`/proton/conversations/${CHAT}`), () => HttpResponse.json(chat())));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Three hours.")).toBeTruthy();
    expect(screen.getByText("How many hours on the villa?")).toBeTruthy();
    expect(screen.queryByText(/Good (morning|afternoon|evening)/)).toBeNull();
    expect(asked).toHaveLength(0);
  });

  it("forgets a chat that is gone and opens on a fresh one", async () => {
    serve();
    Storage.setItemSync(OPEN_CHAT_KEY, CHAT);
    server.use(
      http.get(api(`/proton/conversations/${CHAT}`), () =>
        HttpResponse.json(
          { type: "not_found", code: "not_found", message: "Gone.", errors: null },
          { status: 404 },
        ),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText(/Good (morning|afternoon|evening), Nadia\./)).toBeTruthy();
    await waitFor(() => expect(Storage.getItemSync(OPEN_CHAT_KEY)).toBeNull());
  });

  it("only reads a chat whose access changed, and says why", async () => {
    serve();
    Storage.setItemSync(OPEN_CHAT_KEY, CHAT);
    server.use(
      http.get(api(`/proton/conversations/${CHAT}`), () =>
        HttpResponse.json(chat({ canContinue: false })),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Three hours.")).toBeTruthy();
    expect(screen.getByText(/Your access changed since this chat/)).toBeTruthy();
    expect(screen.queryByLabelText("Ask Proton")).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "New chat" }));
    expect(await screen.findByLabelText("Ask Proton")).toBeTruthy();
    expect(screen.queryByText("Three hours.")).toBeNull();
  });

  it("shows the reason for a chat whose messages are hidden", async () => {
    serve();
    Storage.setItemSync(OPEN_CHAT_KEY, CHAT);
    server.use(
      http.get(api(`/proton/conversations/${CHAT}`), () =>
        HttpResponse.json(
          chat({
            canContinue: false,
            hidden: "You can no longer see this project.",
            messages: [],
          }),
        ),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("You can no longer see this project.")).toBeTruthy();
    expect(screen.queryByLabelText("Ask Proton")).toBeNull();
  });
});

describe("the chat list", () => {
  function serveList(items = [summary(CHAT, "Villa hours"), summary(OTHER_CHAT, "Site visit")]) {
    serve();
    const searches: (string | null)[] = [];
    server.use(
      http.get(api("/proton/conversations"), ({ request }) => {
        searches.push(new URL(request.url).searchParams.get("search"));
        return HttpResponse.json({ items, page: 1, pageSize: 20, totalCount: items.length });
      }),
    );
    return searches;
  }

  it("opens a saved chat and makes it the one to bring back", async () => {
    serveList();
    server.use(
      http.get(api(`/proton/conversations/${OTHER_CHAT}`), () =>
        HttpResponse.json(chat({ id: OTHER_CHAT, title: "Site visit" })),
      ),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "Chats" }));
    await fireEvent.press(await screen.findByRole("button", { name: /^Site visit,/ }));
    expect(await screen.findByText("Three hours.")).toBeTruthy();
    expect(Storage.getItemSync(OPEN_CHAT_KEY)).toBe(OTHER_CHAT);
    expect(screen.queryByText("Your chats")).toBeNull();
  });

  it("searches by name", async () => {
    const searches = serveList();
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "Chats" }));
    await screen.findByRole("button", { name: /^Villa hours,/ });
    await fireEvent.changeText(screen.getByLabelText("Search chats"), "site");
    await waitFor(() => expect(searches).toContain("site"));
  });

  it("renames a chat held down", async () => {
    serveList();
    const renamed: unknown[] = [];
    server.use(
      http.patch(api(`/proton/conversations/${CHAT}`), async ({ request }) => {
        renamed.push(await request.json());
        return HttpResponse.json(summary(CHAT, "Villa budget"));
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "Chats" }));
    await fireEvent(await screen.findByRole("button", { name: /^Villa hours,/ }), "longPress");

    const name = await screen.findByLabelText("Name");
    await fireEvent.changeText(name, "  Villa budget ");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(renamed).toEqual([{ title: "Villa budget" }]));
  });

  it("deletes a chat only after asking, and leaves the chat if it was open", async () => {
    serve();
    Storage.setItemSync(OPEN_CHAT_KEY, CHAT);
    const deleted: string[] = [];
    let items = [summary(CHAT, "Villa hours")];
    server.use(
      http.get(api(`/proton/conversations/${CHAT}`), () => HttpResponse.json(chat())),
      http.get(api("/proton/conversations"), () =>
        HttpResponse.json({ items, page: 1, pageSize: 20, totalCount: items.length }),
      ),
      http.delete(api(`/proton/conversations/${CHAT}`), () => {
        deleted.push(CHAT);
        items = [];
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Three hours.")).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Chats" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Delete Villa hours" }));
    expect(deleted).toEqual([]);
    expect(screen.getByText("Delete this chat?")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleted).toEqual([CHAT]));
    await waitFor(() => expect(Storage.getItemSync(OPEN_CHAT_KEY)).toBeNull());
  });

  it("keeps the chat when the question is cancelled", async () => {
    serveList();
    const deleted: string[] = [];
    server.use(
      http.delete(api("/proton/conversations/:id"), ({ params }) => {
        deleted.push(String(params.id));
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "Chats" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Delete Villa hours" }));
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(deleted).toEqual([]);
  });
});

const table = {
  id: "t1",
  type: "table",
  title: "Hours by project",
  period: "This month",
  chart: null,
  table: {
    columns: [
      { key: "name", label: "Project", kind: "text", unit: null },
      { key: "hours", label: "Hours", kind: "number", unit: "hours" },
    ],
    rows: Array.from({ length: 7 }, (_, i) => ({
      cells: [{ text: `Project ${i + 1}` }, { number: i === 1 ? null : i + 1 }],
      ref: { type: "project", id: i + 1, name: `Project ${i + 1}`, domain: "design" },
    })),
    totalRows: 7,
  },
  kpis: null,
  notes: ["Only projects with hours."],
  source,
};

const kpis = {
  id: "k1",
  type: "kpis",
  title: "This month",
  period: null,
  chart: null,
  table: null,
  kpis: {
    items: [
      { key: "h", label: "Logged", unit: "hours", value: 3, previous: 5, change: -2 },
      { key: "c", label: "Cost", unit: "usd", value: null, previous: null, change: null },
    ],
  },
  notes: [],
  source,
};

const chart = {
  id: "c1",
  type: "chart",
  title: "Hours by project",
  period: "This month",
  chart: {
    kind: "bar",
    axisLabel: "Project",
    axis: "text",
    series: [{ key: "hours", label: "Hours", unit: "hours" }],
    points: [
      { label: "Project 1", values: [3] },
      { label: "Project 2", values: [null] },
    ],
  },
  table: null,
  kpis: null,
  notes: [],
  source,
};

describe("figures under an answer", () => {
  const withBlocks = (...blocks: unknown[]) =>
    serve({ blocks: blocks as Schemas["ProtonReplyResponse"]["blocks"] });

  it("shows the first five rows of a table and all of them on request", async () => {
    withBlocks(table);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Show me the hours");
    expect(await screen.findByText("Hours by project")).toBeTruthy();
    expect(screen.getByText("Project 5")).toBeTruthy();
    expect(screen.queryByText("Project 6")).toBeNull();
    expect(screen.getByText("–")).toBeTruthy();
    expect(screen.getByText("Only projects with hours.")).toBeTruthy();
    expect(screen.getByText(/^Read at /)).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Show all 7 rows" }));
    expect(await screen.findByText("Project 7")).toBeTruthy();
    expect(screen.getByText("Project 6")).toBeTruthy();
  });

  it("opens the record a table row is about from its first cell", async () => {
    withBlocks(table);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Show me the hours");
    await fireEvent.press(await screen.findByRole("link", { name: "Project 3" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/projects/[id]", params: { id: "3" } });
  });

  it("shows headline figures with their change, and a dash for a missing one", async () => {
    withBlocks(kpis);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("How is this month?");
    expect(await screen.findByLabelText("Logged: 3h, -2h vs 5h")).toBeTruthy();
    expect(screen.getByLabelText("Cost: –")).toBeTruthy();
  });

  it("describes a chart in words and offers its figures as a table", async () => {
    withBlocks(chart);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Show me the hours");
    const picture = await screen.findByLabelText("Bar chart: Hours by project, This month");
    expect(picture.props.accessibilityValue).toEqual({ text: "Project 1 3h; Project 2 –." });
    expect(screen.getByText("No figure for 1 of them.")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Show figures as a table" }));
    const sheet = await screen.findByText("Project 2");
    expect(sheet).toBeTruthy();
  });

  it("leaves out a block that doesn't fit and keeps the rest", async () => {
    withBlocks({ ...chart, id: "bad", chart: null }, kpis);
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask("Show me");
    expect(await screen.findByLabelText("Logged: 3h, -2h vs 5h")).toBeTruthy();
    expect(screen.queryByText("Hours by project")).toBeNull();
  });

  it("brings back a saved chat's figures", async () => {
    serve();
    Storage.setItemSync(OPEN_CHAT_KEY, CHAT);
    const saved = chat({
      messages: [message({ blocks: [kpis] as unknown as Stored["blocks"] })],
    });
    server.use(http.get(api(`/proton/conversations/${CHAT}`), () => HttpResponse.json(saved)));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    expect(await screen.findByLabelText("Logged: 3h, -2h vs 5h")).toBeTruthy();
  });
});

describe("remembering", () => {
  const MESSAGE = "Keep answers short";

  async function answered() {
    serve();
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await ask(MESSAGE);
    await screen.findByText("Three hours.");
  }

  it("asks first, then keeps a message the person wrote", async () => {
    await answered();
    const saved: unknown[] = [];
    server.use(
      http.post(api("/proton/memories"), async ({ request }) => {
        saved.push(await request.json());
        return HttpResponse.json({ id: 9, text: MESSAGE, createdAt: "2026-10-13T08:00:00Z" });
      }),
    );
    await fireEvent(screen.getByText(MESSAGE), "longPress");
    expect(await screen.findByText("Remember this?")).toBeTruthy();
    expect(saved).toEqual([]);

    await fireEvent.press(screen.getByRole("button", { name: "Remember" }));
    expect(await screen.findByText("I'll remember that.")).toBeTruthy();
    expect(saved).toEqual([{ conversationId: CHAT, text: MESSAGE }]);
  });

  it("shows the API's reason when it refuses to remember", async () => {
    await answered();
    server.use(
      http.post(api("/proton/memories"), () =>
        HttpResponse.json(
          {
            type: "business_rule",
            code: "proton_memory_refused",
            message: "That reads like an instruction to act, not a preference.",
            errors: null,
          },
          { status: 422 },
        ),
      ),
    );
    await fireEvent(screen.getByText(MESSAGE), "longPress");
    await fireEvent.press(await screen.findByRole("button", { name: "Remember" }));
    expect(
      await screen.findByText("That reads like an instruction to act, not a preference."),
    ).toBeTruthy();
  });

  it("lists what Proton remembers and forgets one on request", async () => {
    serve();
    let memories = [
      { id: 9, text: "Keep answers short", createdAt: "2026-10-13T08:00:00Z" },
      { id: 10, text: "Answer in French", createdAt: "2026-10-13T08:01:00Z" },
    ];
    const forgotten: string[] = [];
    server.use(
      http.get(api("/proton/memories"), () => HttpResponse.json(memories)),
      http.delete(api("/proton/memories/:id"), ({ params }) => {
        forgotten.push(String(params.id));
        memories = memories.filter((m) => String(m.id) !== params.id);
        return new HttpResponse(null, { status: 200 });
      }),
    );
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "What I remember" }));
    expect(await screen.findByText("Answer in French")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "Forget Answer in French" }));
    await waitFor(() => expect(forgotten).toEqual(["10"]));
    await waitFor(() => expect(screen.queryByText("Answer in French")).toBeNull());
  });

  it("says when there is nothing to remember yet", async () => {
    serve();
    server.use(http.get(api("/proton/memories"), () => HttpResponse.json([])));
    await renderWithProviders(<ProtonScreen />, { persona: "designAdmin" });
    await fireEvent.press(screen.getByRole("button", { name: "What I remember" }));
    expect(await screen.findByText(/^Nothing yet\./)).toBeTruthy();
  });
});
