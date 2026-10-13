import { fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import type { Schemas } from "@/api/types";
import { P } from "@/permissions/codes";
import { api } from "@test/handlers";
import { personas, withPermissions } from "@test/personas";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { AdminTodayScreen, deadlineWords } from "./screens/AdminTodayScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

afterEach(() => jest.clearAllMocks());

const deadline = (change: Partial<Schemas["DeadlineResponse"]>): Schemas["DeadlineResponse"] => ({
  assignees: [],
  daysLeft: 2,
  deadline: "2026-10-10",
  isOverdue: false,
  project: { id: 7, title: "Villa Haddad", icon: null, tint: null },
  requirementId: 31,
  text: "Concept approved",
  ...change,
});

const asked: string[] = [];

function serve() {
  asked.length = 0;
  const seen = (name: string) => asked.push(name);
  server.use(
    http.get(api("/dashboard/:domain/deadlines"), () => {
      seen("deadlines");
      return HttpResponse.json({
        total: 2,
        overdue: 1,
        items: [
          deadline({ requirementId: 30, text: "Send the quote", daysLeft: -3, isOverdue: true }),
          deadline({}),
        ],
      });
    }),
    http.get(api("/reports/overview"), () => {
      seen("overview");
      return HttpResponse.json({
        attention: [
          {
            kind: "idle",
            projectId: 8,
            title: "Cedar Loft",
            days: 9,
            count: null,
            people: null,
            progressPct: null,
          },
          {
            kind: "closeout",
            projectId: 9,
            title: "Olive House",
            days: null,
            count: null,
            people: null,
            progressPct: 92,
          },
        ],
      });
    }),
    http.get(api("/meetings"), () =>
      HttpResponse.json([
        {
          id: 5,
          topic: "Client review",
          project: { id: 7, title: "Villa Haddad", icon: null, tint: null },
          startsAt: "2026-10-08T07:00:00Z",
          endsAt: "2026-10-08T08:00:00Z",
        },
      ]),
    ),
    http.get(api("/notifications/unread-count"), () => HttpResponse.json({ unread: 3 })),
  );
}

describe("AdminTodayScreen", () => {
  it("shows what is late, what is quiet, what is nearly done, the meetings and the unread count", async () => {
    serve();
    await renderWithProviders(<AdminTodayScreen />, { persona: "designAdmin" });
    expect(await screen.findByText("Send the quote")).toBeTruthy();
    expect(screen.getByText("3 days overdue")).toBeTruthy();
    expect(screen.getByText("2 days left")).toBeTruthy();
    expect(screen.getByText("Deadlines · 1 overdue")).toBeTruthy();
    expect(await screen.findByText("Cedar Loft")).toBeTruthy();
    expect(screen.getByText("9 days without work")).toBeTruthy();
    expect(screen.getByText("92% done")).toBeTruthy();
    expect(await screen.findByText("Client review")).toBeTruthy();
    expect(await screen.findByText("3 unread alerts")).toBeTruthy();
  });

  it("opens the requirement behind a deadline", async () => {
    serve();
    await renderWithProviders(<AdminTodayScreen />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: /Send the quote/ }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/projects/[id]/requirements",
      params: { id: "7", requirementId: "30" },
    });
  });

  it("asks for no reports from someone without report:view", async () => {
    serve();
    await renderWithProviders(<AdminTodayScreen />, {
      persona: withPermissions(personas.designAdmin, { revoke: [P.REPORT_VIEW] }),
    });
    await screen.findByText("Client review");
    expect(asked).toEqual([]);
    expect(screen.queryByText("Deadlines")).toBeNull();
  });

  it("asks Design's reports only of a Design admin", async () => {
    serve();
    await renderWithProviders(<AdminTodayScreen />, { persona: "executionAdmin" });
    expect(await screen.findByText("Send the quote")).toBeTruthy();
    expect(asked).toEqual(["deadlines"]);
  });

  it("opens Proton from the header with the dashboard as its page", async () => {
    serve();
    await renderWithProviders(<AdminTodayScreen />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: "Ask Proton" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/proton",
      params: { page: "dashboard", area: "design" },
    });
  });

  it("has no Proton button for an admin without proton:use", async () => {
    serve();
    await renderWithProviders(<AdminTodayScreen />, {
      persona: withPermissions(personas.designAdmin, { revoke: [P.PROTON_USE] }),
    });
    await screen.findByText("Client review");
    expect(screen.queryByRole("button", { name: "Ask Proton" })).toBeNull();
  });
});

describe("deadlineWords", () => {
  it("speaks of days overdue, due today and days left", () => {
    expect(deadlineWords({ daysLeft: -1, isOverdue: true })).toBe("1 day overdue");
    expect(deadlineWords({ daysLeft: 0, isOverdue: false })).toBe("Due today");
    expect(deadlineWords({ daysLeft: 5, isOverdue: false })).toBe("5 days left");
  });
});
