import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import type { ProtonUiCommand, Schemas } from "@/api/types";
import { permissionsOf } from "@/permissions/permissions";
import { api } from "@test/handlers";
import { personas } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { planCommands } from "./runCommands";
import { ProtonScreen } from "./screens/ProtonScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ about: "project", id: "7", area: "design" }),
}));

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

const CONVERSATION = "11111111-1111-1111-1111-111111111111";
const ACTION = "22222222-2222-2222-2222-222222222222";

const command = (change: Partial<ProtonUiCommand>): ProtonUiCommand => ({
  type: "open_project",
  id: 7,
  clientId: null,
  domain: "design",
  label: "Villa Haddad",
  page: null,
  section: null,
  tab: null,
  ...change,
});

function reply(
  change: Partial<Schemas["ProtonReplyResponse"]> = {},
): Schemas["ProtonReplyResponse"] {
  return {
    choices: [],
    conversationId: CONVERSATION,
    limited: false,
    pendingAction: null,
    refs: [],
    reply: "Villa Haddad is on track.",
    sources: [],
    uiCommands: [],
    usage,
    ...change,
  };
}

const pending: Schemas["ProtonPendingAction"] = {
  id: ACTION,
  tool: "hold_project",
  risk: "medium",
  expiresAt: "2099-01-01T00:00:00Z",
  preview: {
    title: "Put Villa Haddad on hold",
    note: null,
    opensAfter: "Villa Haddad",
    changes: [{ label: "Status", before: "Active", after: "On hold" }],
  },
};

const asked: unknown[] = [];
const decided: { path: string; body: unknown }[] = [];

function serve(first: Schemas["ProtonReplyResponse"], outcomeCommands: ProtonUiCommand[] = []) {
  asked.length = 0;
  decided.length = 0;
  server.use(
    http.get(api("/proton/usage"), () => HttpResponse.json(usage)),
    http.post(api("/proton/messages"), async ({ request }) => {
      asked.push(await request.json());
      return HttpResponse.json(first);
    }),
    http.post(api("/proton/actions/:id/:decision"), async ({ request, params }) => {
      decided.push({ path: `${params.id}/${params.decision}`, body: await request.json() });
      return HttpResponse.json({
        actionId: ACTION,
        message: "Done.",
        refs: [],
        status: "succeeded",
        uiCommands: outcomeCommands,
      });
    }),
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
      page: { area: "design", page: "projects", entityType: "project", entityId: 7, section: null },
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
});

describe("planCommands", () => {
  const admin = permissionsOf(personas.designAdmin);

  it("opens a project in a domain the person sees", () => {
    expect(planCommands([command({})], admin)).toEqual({
      kind: "go",
      href: { pathname: "/projects/[id]", params: { id: "7" } },
      label: "Villa Haddad",
    });
  });

  it("refuses a domain the person can't see, a bad id and pages that live on the web", () => {
    expect(planCommands([command({ domain: "execution" })], admin)).toEqual({
      kind: "unavailable",
    });
    expect(planCommands([command({ id: -1 })], admin)).toEqual({ kind: "unavailable" });
    expect(
      planCommands([command({ type: "open_page", id: null, page: "reports" })], admin),
    ).toEqual({ kind: "unavailable" });
  });

  it("refuses screens the person's permissions don't open", () => {
    const employee = permissionsOf(personas.designEmployee);
    expect(planCommands([command({ type: "open_client", id: 3 })], employee)).toEqual({
      kind: "unavailable",
    });
  });

  it("refreshes, and does nothing for no commands", () => {
    expect(planCommands([command({ type: "refresh" })], admin)).toEqual({ kind: "refresh" });
    expect(planCommands([], admin)).toBeNull();
    expect(planCommands(undefined, admin)).toBeNull();
  });
});
