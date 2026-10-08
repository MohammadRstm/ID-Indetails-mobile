import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import type { Project } from "@/api/types";
import { aProject, aRequirement } from "@/features/projects/slots/testData";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { clearToasts, ToastHost } from "@/ui";
import { AddRequirementButton } from "./AddRequirementButton";
import { RequirementManageActions } from "./RequirementManageActions";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

afterEach(async () => {
  await act(() => clearToasts());
  jest.clearAllMocks();
});

const serveProject = (project: Project = aProject()) =>
  server.use(http.get(api("/projects/7"), () => HttpResponse.json(project)));

describe("AddRequirementButton", () => {
  it("opens the editor for the project", async () => {
    serveProject();
    await renderWithProviders(<AddRequirementButton projectId={7} />, { persona: "designAdmin" });
    await fireEvent.press(await screen.findByRole("button", { name: "Add a requirement" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/requirements/edit",
      params: { projectId: "7" },
    });
  });

  it("is hidden from employees", async () => {
    await renderWithProviders(<AddRequirementButton projectId={7} />, {
      persona: "executionEmployee",
    });
    expect(screen.queryByRole("button", { name: "Add a requirement" })).toBeNull();
  });

  it("is hidden while the project is closed", async () => {
    serveProject(aProject({ status: "archived" }));
    const { queryClient } = await renderWithProviders(<AddRequirementButton projectId={7} />, {
      persona: "superAdmin",
    });
    await waitFor(() => expect(queryClient.getQueryData(["projects", "detail", 7])).toBeTruthy());
    expect(screen.queryByRole("button", { name: "Add a requirement" })).toBeNull();
  });
});

describe("RequirementManageActions", () => {
  const render = (
    requirement = aRequirement(),
    persona: "designAdmin" | "designEmployee" = "designAdmin",
  ) =>
    renderWithProviders(
      <>
        <RequirementManageActions projectId={7} requirement={requirement} />
        <ToastHost />
      </>,
      { persona },
    );
  const openMenu = async () =>
    fireEvent.press(await screen.findByRole("button", { name: "Requirement actions" }));

  it("ticks anyone's requirement", async () => {
    serveProject();
    let ticked = false;
    server.use(
      http.post(api("/projects/7/requirements/31/done"), () => {
        ticked = true;
        return HttpResponse.json(aRequirement({ isDone: true }));
      }),
    );
    await render();
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Mark as done" }));
    expect(await screen.findByText("Requirement done")).toBeTruthy();
    expect(ticked).toBe(true);
  });

  it("unticks a done one", async () => {
    serveProject();
    let unticked = false;
    server.use(
      http.post(api("/projects/7/requirements/31/undone"), () => {
        unticked = true;
        return HttpResponse.json(aRequirement());
      }),
    );
    await render(aRequirement({ isDone: true, doneAt: "2026-10-01T08:00:00Z" }));
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Mark as not done" }));
    expect(await screen.findByText("Requirement reopened")).toBeTruthy();
    expect(unticked).toBe(true);
  });

  it("deletes only after asking", async () => {
    serveProject();
    let deleted = false;
    server.use(
      http.delete(api("/projects/7/requirements/31"), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await render();
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete this requirement?")).toBeTruthy();
    expect(deleted).toBe(false);
    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Requirement deleted")).toBeTruthy();
    expect(deleted).toBe(true);
  });

  it("opens the editor on the requirement", async () => {
    serveProject();
    await render();
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Edit" }));
    expect(router.push).toHaveBeenCalledWith({
      pathname: "/requirements/edit",
      params: { projectId: "7", id: "31" },
    });
  });

  it("says when the API refuses", async () => {
    serveProject();
    server.use(
      http.post(api("/projects/7/requirements/31/done"), () =>
        HttpResponse.json(
          {
            type: "business_rule",
            code: "project_closed",
            message: "The project is closed.",
            errors: null,
          },
          { status: 422 },
        ),
      ),
    );
    await render();
    await openMenu();
    await fireEvent.press(screen.getByRole("button", { name: "Mark as done" }));
    expect(await screen.findByText("That didn't save")).toBeTruthy();
    expect(screen.getByText("The project is closed.")).toBeTruthy();
  });

  it("is hidden from employees", async () => {
    await render(aRequirement(), "designEmployee");
    expect(screen.queryByRole("button", { name: "Requirement actions" })).toBeNull();
  });
});
