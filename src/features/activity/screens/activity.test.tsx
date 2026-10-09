import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { aProject } from "@/features/projects/slots/testData";
import { P } from "@/permissions/codes";
import { api } from "@test/handlers";
import { personas, withPermissions } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { anEvent, page } from "../testData";
import { ActivityScreen } from "./ActivityScreen";
import { ProjectActivityScreen } from "./ProjectActivityScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

afterEach(() => jest.clearAllMocks());

const asked: URLSearchParams[] = [];

function serve(items = [anEvent()], totalCount = items.length) {
  asked.length = 0;
  server.use(
    http.get(api("/activity"), ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json(page(items, totalCount));
    }),
    http.get(api("/employees"), () =>
      HttpResponse.json({ items: [], page: 1, pageSize: 100, totalCount: 0 }),
    ),
    http.get(api("/projects/7"), () => HttpResponse.json(aProject())),
  );
}

describe("ActivityScreen", () => {
  it("says what happened in the web's words and opens the project", async () => {
    serve();
    await renderWithProviders(<ActivityScreen />, { persona: "designAdmin" });
    const row = await screen.findByRole("button", { name: /Nadia Test put Villa Haddad on hold/ });
    expect(asked[0].get("domain")).toBe("design");
    await fireEvent.press(row);
    expect(router.push).toHaveBeenCalledWith({ pathname: "/projects/[id]", params: { id: "7" } });
  });

  it("shows logged work with its description", async () => {
    serve([
      anEvent({
        kind: "work_entry_logged",
        group: "work",
        actor: { id: 4, name: "Sarah Test" },
        workEntry: {
          id: 90,
          minutes: 120,
          overtimeMinutes: 0,
          description: "Moodboard for the kitchen",
          startedAt: "2026-10-08T06:00:00Z",
          endedAt: "2026-10-08T08:00:00Z",
          createdAt: "2026-10-08T08:00:00Z",
          updatedAt: null,
          canEdit: false,
          commentCount: 0,
          attachment: null,
          person: { id: 4, name: "Sarah Test" },
          project: { id: 7, title: "Villa Haddad", icon: null, tint: null },
        },
      }),
    ]);
    await renderWithProviders(<ActivityScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Moodboard for the kitchen")).toBeTruthy();
    expect(screen.getByText(/logged 2h 00m on Villa Haddad/)).toBeTruthy();
  });

  it("filters by kind", async () => {
    serve();
    await renderWithProviders(<ActivityScreen />, { persona: "designAdmin" });
    await screen.findByRole("button", { name: /put Villa Haddad on hold/ });
    await fireEvent.press(screen.getByRole("button", { name: "People" }));
    await waitFor(() => expect(asked.some((q) => q.get("group") === "people")).toBe(true));
  });

  it("offers the work filter only to people who see everyone's work", async () => {
    serve();
    await renderWithProviders(<ActivityScreen />, {
      persona: withPermissions(personas.designAdmin, { revoke: [P.WORK_ENTRY_VIEW_ALL] }),
    });
    await screen.findByRole("button", { name: /put Villa Haddad on hold/ });
    expect(screen.queryByRole("button", { name: "Work logged" })).toBeNull();
    expect(screen.getByRole("button", { name: "Money" })).toBeTruthy();
  });

  it("never shows an amount without financial:view", async () => {
    serve([anEvent({ kind: "revenue_changed", group: "money", amount: 12000, prevAmount: 9500 })]);
    await renderWithProviders(<ActivityScreen />, { persona: "designAdmin" });
    expect(await screen.findByText(/changed the payment for Villa Haddad/)).toBeTruthy();
    expect(screen.queryByText(/\$12k/)).toBeNull();
  });

  it("loads older events on request", async () => {
    serve([anEvent()], 41);
    await renderWithProviders(<ActivityScreen />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: "Load more" }));
    await waitFor(() => expect(asked.some((q) => q.get("page") === "2")).toBe(true));
  });

  it("says so when nothing has happened", async () => {
    serve([]);
    await renderWithProviders(<ActivityScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Nothing has happened yet")).toBeTruthy();
  });
});

describe("ProjectActivityScreen", () => {
  it("shows the project's events, without linking back to it", async () => {
    serve();
    await renderWithProviders(<ProjectActivityScreen projectId={7} />, {
      persona: "executionAdmin",
    });
    expect(await screen.findByText(/put Villa Haddad on hold/)).toBeTruthy();
    expect(asked[0].get("projectId")).toBe("7");
    expect(screen.queryByRole("button", { name: /put Villa Haddad on hold/ })).toBeNull();
    expect(await screen.findByText("Villa Haddad")).toBeTruthy();
  });
});
