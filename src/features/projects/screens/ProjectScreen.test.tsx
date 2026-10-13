import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { http, HttpResponse } from "msw";
import { ProjectRequirementsScreen } from "@/features/requirements/screens/ProjectRequirementsScreen";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import type { Project } from "@/api/types";
import { contributor, project, projectWork, requirement } from "../testing";
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

// Only the parts the Money section reads.
const money = {
  currency: "USD",
  revenue: 9000,
  profit: 2500,
  margin: 0.28,
  cost: { total: 6500 },
  billing: { received: 4000, outstanding: 5000, overdue: 0, overdueCount: 0 },
} as unknown as NonNullable<Project["money"]>;

const SECTION_TITLES = ["Money", "Overview", "Who worked", "Requirements", "Meetings"];

/** The sections on screen, top to bottom. */
function shownSections() {
  return screen
    .getAllByRole("header")
    .map((node) => node.props.children as string)
    .filter((title) => SECTION_TITLES.includes(title));
}

describe("the project screen ordered by permission", () => {
  let workAsked = false;

  function serveWork(p: Project) {
    workAsked = false;
    serve(p);
    server.use(
      http.get(api(`/projects/${p.id}/work`), () => {
        workAsked = true;
        return HttpResponse.json(
          projectWork(p.id, [
            contributor(4, "Sarah Test", 150, { entries: 4 }),
            contributor(9, "Omar Test", 90),
          ]),
        );
      }),
    );
  }

  it("gives a super admin money first, then who worked, requirements and meetings", async () => {
    serveWork(project(8, "design", { money }));
    await renderWithProviders(<ProjectScreen projectId={8} section={null} />, {
      persona: "superAdmin",
    });
    expect(await screen.findByText("Omar Test")).toBeTruthy();
    expect(shownSections()).toEqual(["Money", "Who worked", "Requirements", "Meetings"]);
    expect(screen.getByText("2h 30m")).toBeTruthy();
  });

  it("gives a Design admin who worked without any money", async () => {
    serveWork(project(8, "design", { money }));
    await renderWithProviders(<ProjectScreen projectId={8} section={null} />, {
      persona: "designAdmin",
    });
    expect(await screen.findByText("Omar Test")).toBeTruthy();
    expect(shownSections()).toEqual(["Who worked", "Requirements", "Meetings"]);
  });

  it("gives a Design employee their overview and never asks for everyone's work", async () => {
    serveWork(project(8, "design"));
    await renderWithProviders(<ProjectScreen projectId={8} section={null} />, {
      persona: "designEmployee",
    });
    await screen.findByText("Villa Haddad");
    expect(shownSections()).toEqual(["Overview", "Requirements", "Meetings"]);
    expect(workAsked).toBe(false);
  });

  it("gives an Execution admin no who-worked section", async () => {
    serveWork(project(7, "execution"));
    await renderWithProviders(<ProjectScreen projectId={7} section={null} />, {
      persona: "executionAdmin",
    });
    await screen.findByText("Faqra chalet");
    expect(shownSections()).toEqual(["Overview", "Requirements", "Meetings"]);
    expect(workAsked).toBe(false);
  });

  it("opens on a section by link without hiding any other", async () => {
    serveWork(project(8, "design"));
    await renderWithProviders(<ProjectScreen projectId={8} section="meetings" />, {
      persona: "designEmployee",
    });
    await screen.findByText("Villa Haddad");
    expect(shownSections()).toEqual(["Overview", "Requirements", "Meetings"]);
  });

  it("ignores a link to a section the person can't see", async () => {
    serveWork(project(8, "design"));
    await renderWithProviders(<ProjectScreen projectId={8} section="financials" />, {
      persona: "designEmployee",
    });
    await screen.findByText("Villa Haddad");
    expect(shownSections()).toEqual(["Overview", "Requirements", "Meetings"]);
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
