import { act, fireEvent, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { http, HttpResponse } from "msw";
import type { Project } from "@/api/types";
import { aProject, aRequirement, anEmployee } from "@/features/projects/slots/testData";
import { api } from "@test/handlers";
import { renderWithProviders } from "@test/render";
import { server } from "@test/server";
import { clearToasts, ToastHost } from "@/ui";
import { EditRequirementScreen } from "./EditRequirementScreen";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true },
}));

afterEach(async () => {
  await act(() => clearToasts());
  jest.clearAllMocks();
});

function serve(project: Project = aProject()) {
  server.use(
    http.get(api("/projects/7"), () => HttpResponse.json(project)),
    http.get(api("/projects/7/requirements"), () =>
      HttpResponse.json({ items: [aRequirement()], total: 1, done: 0, overdue: 0, progressPct: 0 }),
    ),
    http.get(api("/employees"), ({ request }) => {
      const params = new URL(request.url).searchParams;
      const items =
        params.get("role") === "employee" && params.get("domain") === "design"
          ? [anEmployee(), anEmployee({ id: 8, firstName: "Ziad", status: "deactivated" })]
          : [];
      return HttpResponse.json({ items, page: 1, pageSize: 100, totalCount: items.length });
    }),
  );
}

const render = (requirementId: number | null) =>
  renderWithProviders(
    <>
      <EditRequirementScreen projectId={7} requirementId={requirementId} />
      <ToastHost />
    </>,
    { persona: "designAdmin" },
  );

describe("EditRequirementScreen", () => {
  it("adds a requirement with its assignees", async () => {
    serve();
    let body: unknown;
    server.use(
      http.post(api("/projects/7/requirements"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(aRequirement({ id: 40 }));
      }),
    );
    await render(null);
    await fireEvent.changeText(await screen.findByLabelText("Requirement"), "  Site survey done  ");
    await fireEvent.press(screen.getByRole("button", { name: "Assigned to: Not assigned" }));
    expect(screen.queryByRole("button", { name: /Ziad/ })).toBeNull();
    await fireEvent.press(await screen.findByRole("button", { name: /Sarah Test/ }));
    await fireEvent.press(screen.getByRole("button", { name: "Done" }));
    await fireEvent.press(screen.getByRole("button", { name: "Add requirement" }));

    expect(await screen.findByText("Requirement added · 1 notified")).toBeTruthy();
    expect(body).toEqual({ text: "Site survey done", deadline: null, assigneeIds: [4] });
    expect(router.back).toHaveBeenCalled();
  });

  it("asks for the text before sending anything", async () => {
    serve();
    let sent = false;
    server.use(
      http.post(api("/projects/7/requirements"), () => {
        sent = true;
        return HttpResponse.json(aRequirement());
      }),
    );
    await render(null);
    await fireEvent.press(await screen.findByRole("button", { name: "Add requirement" }));
    expect(screen.getByText("Write what has to be achieved.")).toBeTruthy();
    expect(sent).toBe(false);
  });

  it("shows the API's field errors next to their fields", async () => {
    serve();
    server.use(
      http.post(api("/projects/7/requirements"), () =>
        HttpResponse.json(
          {
            type: "validation",
            code: "validation_failed",
            message: "Check the highlighted fields.",
            errors: { Deadline: ["The deadline must be in this century."] },
          },
          { status: 400 },
        ),
      ),
    );
    await render(null);
    await fireEvent.changeText(await screen.findByLabelText("Requirement"), "Handover");
    await fireEvent.press(screen.getByRole("button", { name: "Add requirement" }));
    expect(await screen.findByText("The deadline must be in this century.")).toBeTruthy();
  });

  it("says when an assignee isn't allowed", async () => {
    serve();
    server.use(
      http.post(api("/projects/7/requirements"), () =>
        HttpResponse.json(
          {
            type: "business_rule",
            code: "assignee_not_allowed",
            message: "Only employees of this domain can be assigned.",
            errors: null,
          },
          { status: 422 },
        ),
      ),
    );
    await render(null);
    await fireEvent.changeText(await screen.findByLabelText("Requirement"), "Handover");
    await fireEvent.press(screen.getByRole("button", { name: "Add requirement" }));
    expect(await screen.findByText("Only employees of this domain can be assigned.")).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("edits a requirement, starting from what it says now", async () => {
    serve();
    let body: unknown;
    server.use(
      http.put(api("/projects/7/requirements/31"), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(aRequirement());
      }),
    );
    await render(31);
    const field = await screen.findByLabelText("Requirement");
    expect(field.props.value).toBe("Concept design approved by the client");
    await fireEvent.press(screen.getByRole("button", { name: "No deadline" }));
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Requirement updated")).toBeTruthy();
    expect(body).toEqual({
      text: "Concept design approved by the client",
      deadline: null,
      assigneeIds: [4],
    });
  });

  it("deletes a requirement after asking", async () => {
    serve();
    let deleted = false;
    server.use(
      http.delete(api("/projects/7/requirements/31"), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await render(31);
    await fireEvent.press(await screen.findByRole("button", { name: "Delete requirement" }));
    await fireEvent.press(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Requirement deleted")).toBeTruthy();
    expect(deleted).toBe(true);
  });

  it("explains that a closed project's requirements can't change", async () => {
    serve(aProject({ status: "completed" }));
    await render(null);
    expect(await screen.findByText("This project is completed")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add requirement" })).toBeNull();
  });
});
