import { screen } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { designSettings, myProject, schedule } from "@/features/work/testing";
import { companyToday } from "@/format/time";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { DesignTodayScreen } from "./design/screens/DesignTodayScreen";
import { ExecutionTodayScreen } from "./execution/screens/ExecutionTodayScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));
jest.mock("expo-sqlite", () => jest.requireActual("@/offline/testing/fakeSqlite"));
jest.setTimeout(20_000);

const today = companyToday();
const noRequirements = { done: 0, dueSoon: 0, items: [], overdue: 0, projects: 0 };

function serveDesignDay(timerEnabled: boolean) {
  server.use(
    http.get(api("/me/day"), () =>
      HttpResponse.json({
        date: today,
        entries: [],
        meetings: [],
        loggedMinutes: 0,
        overtimeMinutes: 0,
      }),
    ),
    http.get(api("/me/schedule"), () => HttpResponse.json(schedule(today, { loggedMinutes: 90 }))),
    http.get(api("/me/work-summary"), () => HttpResponse.json({ thisWeekMinutes: 600 })),
    http.get(api("/me/requirements"), () => HttpResponse.json(noRequirements)),
    http.get(api("/me/projects"), () => HttpResponse.json([myProject(1, "Villa Haddad")])),
    http.get(api("/domain-settings/design"), () =>
      HttpResponse.json({ ...designSettings, timerEnabled }),
    ),
  );
}

it("gives a Design employee the timer, today's hours and Log work", async () => {
  serveDesignDay(true);
  await renderWithProviders(<DesignTodayScreen />, { persona: "designEmployee" });
  expect(await screen.findByRole("button", { name: "Start the timer" })).toBeTruthy();
  expect(await screen.findByText("1h 30m of 7h 00m")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Log work" }).length).toBeGreaterThan(0);
});

it("hides the timer when the domain turned it off", async () => {
  serveDesignDay(false);
  await renderWithProviders(<DesignTodayScreen />, { persona: "designEmployee" });
  await screen.findByText("1h 30m of 7h 00m");
  expect(screen.queryByRole("button", { name: "Start the timer" })).toBeNull();
});

it("gives site staff their sites and Add materials, and no hours", async () => {
  server.use(
    http.get(api("/projects"), () =>
      HttpResponse.json({
        items: [
          {
            id: 9,
            title: "Faqra chalet",
            status: "active",
            domain: "execution",
            startDate: "2026-01-01",
            client: null,
            location: "Faqra",
          },
        ],
        page: 1,
        pageSize: 100,
        totalCount: 1,
      }),
    ),
    http.get(api("/projects/site-summary"), () =>
      HttpResponse.json([
        {
          projectId: 9,
          myLastRecordedAt: null,
          materialCount: 0,
          materialCost: 0,
          groundLabour: 0,
          reportedWeeks: 0,
        },
      ]),
    ),
    http.get(api("/me/requirements"), () => HttpResponse.json(noRequirements)),
  );
  await renderWithProviders(<ExecutionTodayScreen />, { persona: "executionEmployee" });
  expect(await screen.findByText("Faqra chalet")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Add materials" })).toBeTruthy();
  expect(screen.queryByText(/Start the timer|Log work/)).toBeNull();
});
