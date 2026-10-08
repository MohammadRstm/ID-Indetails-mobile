import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { ProjectRequirementsScreen } from "@/features/requirements/screens/ProjectRequirementsScreen";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { project, requirement } from "../testing";
import { ProjectScreen } from "./ProjectScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({}),
}));
jest.mock("expo-sqlite", () => jest.requireActual("@/offline/testing/fakeSqlite"));
jest.setTimeout(20_000);

function serve(p: ReturnType<typeof project>, requirements = [requirement(1)]) {
  server.use(
    http.get(api(`/projects/${p.id}`), () => HttpResponse.json(p)),
    http.get(api(`/projects/${p.id}/meetings`), () => HttpResponse.json([])),
    http.get(api(`/projects/${p.id}/requirements`), () =>
      HttpResponse.json({
        done: 0,
        items: requirements,
        overdue: 0,
        progressPct: 0,
        total: requirements.length,
      }),
    ),
  );
}

describe("the project screen", () => {
  it("gives site staff the site's materials and labour, and no hours", async () => {
    serve(project(7, "execution"));
    await renderWithProviders(<ProjectScreen projectId={7} section={null} />, {
      persona: "executionEmployee",
    });
    expect(await screen.findByText("Faqra chalet")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Materials/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Labour/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add materials" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Log work on this project" })).toBeNull();
  });

  it("lets a Design employee log work on it, with no site sections", async () => {
    serve(project(8, "design"));
    await renderWithProviders(<ProjectScreen projectId={8} section={null} />, {
      persona: "designEmployee",
    });
    expect(await screen.findByRole("button", { name: "Log work on this project" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Materials/ })).toBeNull();
  });

  it("never shows money to these people", async () => {
    serve(project(8, "design"));
    await renderWithProviders(<ProjectScreen projectId={8} section={null} />, {
      persona: "designEmployee",
    });
    await screen.findByText("Villa Haddad");
    expect(screen.queryByText(/\$/)).toBeNull();
  });
});

describe("a project's requirements", () => {
  it("lets an assignee tick their own off, and not someone else's", async () => {
    const p = project(8, "design");
    serve(p, [
      requirement(1, { text: "Mine", assignees: [{ id: 4, name: "Sarah Test" }] }),
      requirement(2, { text: "Theirs", assignees: [{ id: 9, name: "Omar Test" }] }),
    ]);
    let ticked = "";
    server.use(
      http.post(api("/projects/8/requirements/1/done"), () => {
        ticked = "1";
        return HttpResponse.json(requirement(1, { isDone: true }));
      }),
    );
    await renderWithProviders(
      <ProjectRequirementsScreen projectId={8} highlightRequirementId={1} />,
      {
        persona: "designEmployee",
      },
    );
    const mine = await screen.findByRole("checkbox", { name: "Mine" });
    expect(screen.queryByRole("checkbox", { name: "Theirs" })).toBeNull();
    await fireEvent.press(mine);
    await waitFor(() => expect(ticked).toBe("1"));
  });
});
