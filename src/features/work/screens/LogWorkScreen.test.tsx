import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import { addDays, companyToday } from "@/format/time";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { clearToasts } from "@/ui";
import { requestLogWork } from "../logWorkRequest";
import { isoAt } from "../model";
import { designSettings, myProject, schedule, workEntry } from "../testing";
import { LogWorkScreen } from "./LogWorkScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));

jest.setTimeout(20_000);
afterEach(() => clearToasts());

const yesterday = addDays(companyToday(), -1);
const villa = myProject(1, "Villa Haddad", { myLastStartedAt: "2026-10-01T06:00:00Z" });

function serveDay(entries: ReturnType<typeof workEntry>[] = []) {
  server.use(
    http.get(api("/me/projects"), () => HttpResponse.json([villa])),
    http.get(api("/domain-settings/design"), () => HttpResponse.json(designSettings)),
    http.get(api("/me/schedule"), () => HttpResponse.json(schedule(yesterday))),
    http.get(api("/me/day"), () =>
      HttpResponse.json({
        date: yesterday,
        entries,
        meetings: [],
        loggedMinutes: 0,
        overtimeMinutes: 0,
      }),
    ),
    http.post(api("/me/overtime-preview"), () =>
      HttpResponse.json({
        afterHoursMinutes: 0,
        beforeHoursMinutes: 0,
        dayEndMinute: 1020,
        dayStartMinute: 540,
        dayOff: false,
        minutes: 60,
        overtimeMinutes: 0,
        pastRequiredMinutes: 0,
        requiredMinutes: 420,
      }),
    ),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  requestLogWork({
    projectId: 1,
    date: yesterday,
    startMin: 600,
    endMin: 660,
    description: "Kitchen plans",
  });
});

it("logs the work and goes back", async () => {
  serveDay();
  let sent: unknown;
  server.use(
    http.post(api("/work-entries"), async ({ request }) => {
      sent = await request.json();
      return HttpResponse.json(workEntry(50, isoAt(yesterday, 600), isoAt(yesterday, 660)), {
        status: 201,
      });
    }),
  );
  await renderWithProviders(<LogWorkScreen />);
  await fireEvent.press(await screen.findByRole("button", { name: "Log 1h 00m" }));
  await waitFor(() => expect(router.back).toHaveBeenCalled());
  expect(sent).toMatchObject({
    projectId: 1,
    description: "Kitchen plans",
    startedAt: isoAt(yesterday, 600),
    endedAt: isoAt(yesterday, 660),
  });
});

it("treats a retried log that overlaps an identical saved entry as saved", async () => {
  serveDay();
  server.use(
    http.post(api("/work-entries"), () =>
      HttpResponse.json(
        { type: "business_rule", code: "entry_overlaps", message: "Overlaps." },
        { status: 422 },
      ),
    ),
  );
  await renderWithProviders(<LogWorkScreen />);
  const save = await screen.findByRole("button", { name: "Log 1h 00m" });
  // The day now holds the entry the lost first try saved.
  serveDay([workEntry(50, isoAt(yesterday, 600), isoAt(yesterday, 660), villa)]);
  server.use(
    http.post(api("/work-entries"), () =>
      HttpResponse.json(
        { type: "business_rule", code: "entry_overlaps", message: "Overlaps." },
        { status: 422 },
      ),
    ),
  );
  await fireEvent.press(save);
  await waitFor(() => expect(router.back).toHaveBeenCalled());
});

it("says so when the overlap is with another entry", async () => {
  serveDay();
  server.use(
    http.post(api("/work-entries"), () =>
      HttpResponse.json(
        { type: "business_rule", code: "entry_overlaps", message: "Overlaps." },
        { status: 422 },
      ),
    ),
  );
  await renderWithProviders(<LogWorkScreen />);
  await fireEvent.press(await screen.findByRole("button", { name: "Log 1h 00m" }));
  expect(await screen.findByText("This overlaps another of your entries.")).toBeTruthy();
  expect(router.back).not.toHaveBeenCalled();
});
